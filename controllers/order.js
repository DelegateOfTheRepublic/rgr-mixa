import {
    Cart,
    Cart_Product,
    Order,
    Order_Product,
    OrderHistory,
    Product,
    ShippingAddress,
} from "../db/models.js";
import ShortUniqueId from "short-unique-id";
import {ORDER_STATUSES} from "../consts.js";
import {sendEmail} from "../emailNotification.js";
import {arrivedProductsHTML} from "../htmlBlanks.js";
import _ from "lodash";
import {Op} from "sequelize";


class OrderController {
    async list(req, res) {
        return res.status(200).json({ 'orders': await Order.findAll() })
    }

    async create(req, res) {
        const curDate = new Date()
        const rndDay = _.random(2, 14, false)
        const { paymentMethod, shippingAddressId } = req.body
        const cart = await Cart.findByPk(req.user.cartId)
        const cartProducts = await cart.getProducts()
        const order = await Order.create({
            userId: req.user.id,
            number: new ShortUniqueId({ length: 10 }).rnd(),
            payment: paymentMethod,
            shippingAddressId,
            deliveryDate: new Date(`${curDate.getFullYear()}-${curDate.getMonth()}-${curDate.getDate() + rndDay}`),
        })
        const jsonOrder = {
            id: order.id,
            customer: req.user.email,
            shippingAddress: (await ShippingAddress.findByPk(shippingAddressId)).address,
            number: order.number,
            status: order.status,
            payment: order.payment,
            products: [],
            discountedTotalCost: 0,
            totalCost: 0
        }

        for (let product of cartProducts) {
            let discount = await product.getDiscount()
            let discountedPrice = discount === 0? 0 : (1 - discount) * product.price
            let productAmount = (await Cart_Product.findOne({
                where: {
                    cartId: cart.id,
                    productId: product.id,
                }
            })).amount

            jsonOrder.discountedTotalCost += discountedPrice * productAmount

            await order.addProduct(product, {
                through: {
                    amount: productAmount,
                    price: product.price,
                    discount,
                }
            })
            jsonOrder.totalCost += productAmount * product.price
            jsonOrder.products.push({
                name: product.model,
                price: product.price,
                discount,
                discountedPrice,
                productAmount,
                cost: discountedPrice * productAmount
            })
            await Product.increment({ stockQuantity: -productAmount }, { where: { id: product.id } })
        }

        order.startAwaitingPayment()

        return res.status(201).json({ 'order': jsonOrder })
    }

    async update(req, res) {
        let order = await Order.findByPk(req.params.id)

        if (order.status !== ORDER_STATUSES.AWAITING_PAYMENT) {
            return res.status(400).json({ 'error': 'It is not possible to change the OPP address ' +
                    'because the order status is not "Awaiting payment"' })
        }

        await Order.update(
            {
                shippingAddressId: req.body.shippingAddressId,
            },
            {
                where: {
                    id: req.params.id,
                }
            }
        )

        order = await Order.findByPk(req.params.id, { include: Product })

        return res.status(200).json({ 'order': order })
    }

    async payment(req, res) {
        const { id } = req.params
        const order = await Order.findByPk(id)

        await order.update({ status: ORDER_STATUSES.PACKING })
        order.stopAwaitingPayment()

        return res.status(200).json('Payment completed successfully')
    }

    async changeStatus(req, res) {
        const { status } = req.body
        const { id } = req.params
        let order = await Order.findByPk(id)

        order = await order.update({ status })
        order.sendNotification(req.user.email)

        return res.status(200).json('The orders status haas been successfully changed')
    }

    async arrived(req, res) {
        const order = await Order.findByPk(req.params.id)
        const arrivedProducts = {
            shippingAddress: (await ShippingAddress.findByPk(order.shippingAddressId)).address,
            products: (
                await Order_Product.findAll({
                    where: {
                        orderId: order.id,
                    }
                })
            ).map(async orderProductRaw => {
                const product = (await Product.findByPk(orderProductRaw.productId, {
                    attributes: ["name", "image"]
                })).toJSON()
                product.price = orderProductRaw.price
                product.amount = orderProductRaw.amount

                return product
            })
        }
        const isMany = (await order.getProducts()).length >= 2
        const emailData = {
            subject: `${isMany? 'Товары ожидают' : 'Товар ожидает'} в пункте выдачи заказов`,
            html: arrivedProductsHTML(arrivedProducts),
            email: req.user.email,
        }

        await order.update({
            status: ORDER_STATUSES.AT_THE_POINT,
            arrivalDate: new Date()
        })

        sendEmail(emailData.subject, emailData.html, emailData.email)

        return res.status(200).json(`An email was sent to the user with the mail "${req.user.email}"` +
            ` about the incoming order "${order.number}"`)
    }

    async receive(req, res) {
        const { id } = req.params
        const order = await Order.findByPk(id)

        await order.update({
            status: ORDER_STATUSES.RECEIVED,
            receiveDate: new Date(),
        })

        const orderHistory = await order.moveToHistory()

        return res.status(200).json({ 'order': orderHistory })
    }

    async cancle(req, res) {
        const order = await Order.findByPk(req.params.id)

        if ([ORDER_STATUSES.AWAITING_PAYMENT, ORDER_STATUSES.PACKING].includes(order.status)) {
            await order.moveToHistory()

            return res.status(200).json('The order has been successfully canceled.')
        }

        return res.status(400).json({ 'error': 'It is not possible to cancel the order ' +
                'because the orders status is not "Awaiting payment" or "Packing"' })
    }

    async salesReport(req, res) {
        const { startSalesPeriod, endSalesPeriod } = req.body
        let freqSoldProduct = null
        let profitableProduct = null
        const products = {}
        const salesByDates = {}

        const ordersHistory = await OrderHistory.findAll(
            {
                status: ORDER_STATUSES.RECEIVED,
                receiveDate: {
                    [Op.between]: [startSalesPeriod, endSalesPeriod]
                },
                include: Product,
                order: [['deliveryDate', 'ASC']]
            }
        )

        if (_.isEmpty(ordersHistory)) {
            return res.status(200).json('No sales')
        }

        for (let orderHistory of ordersHistory) {
            for (let product of orderHistory.products) {
                if (!_.isUndefined(product.name)) {
                    products[product.name].amount += product.OrderHistory_Product.amount
                    products[product.name].cost += product.OrderHistory_Product.getCost()
                } else {
                    products[product.name] = {
                        amount: product.OrderHistory_Product.amount,
                        cost: product.OrderHistory_Product.getCost()
                    }
                }
            }

            if (!_.isUndefined(salesByDates[orderHistory.deliveryDate])) {
                salesByDates[orderHistory.deliveryDate] += _.max(
                    [orderHistory.totalCost, orderHistory.discountedTotalCost]
                )
            } else {
                salesByDates[orderHistory.deliveryDate] = _.max(
                    [orderHistory.totalCost, orderHistory.discountedTotalCost]
                )
            }
        }

        freqSoldProduct = products[0]
        profitableProduct = products[0]
        for (let product of products) {
            if (product.cost > profitableProduct.cost) {
                profitableProduct = product
            }

            if (product.amount > freqSoldProduct.amount) {
                freqSoldProduct = product
            }
        }

        return res.status(200).json({ products, salesByDates, freqSoldProduct, profitableProduct })
    }
}

export default new OrderController()
