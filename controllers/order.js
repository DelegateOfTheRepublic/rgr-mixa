import {Cart, Cart_Product, Order, Order_Product, Product, ShippingAddress, User} from "../db/models.js";
import ShortUniqueId from "short-unique-id";
import {ORDER_STATUSES} from "../consts.js";
import {sendEmail} from "../emailNotification.js";
import {arrivedProductsHTML} from "../htmlBlanks.js";


class OrderController {
    async list(req, res) {
        return res.status(200).json({ 'orders': await Order.findAll() })
    }

    async create(req, res) {
        const { cartId, paymentMethod, shippingAddressId } = req.body
        const cart = await Cart.findByPk(cartId)
        const cartProducts = await cart.getProducts()
        const order = await Order.create({
            userId: req.user.id,
            number: new ShortUniqueId({ length: 10 }).rnd(),
            payment: paymentMethod,
            shippingAddressId,
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
            let discountedPrice = (1 - discount) * product.price
            jsonOrder.discountedTotalCost += discountedPrice
            let productAmount = (await Cart_Product.findOne({
                where: {
                    cartId: cart.id,
                    productId: product.id,
                }
            })).productAmount
            await order.addProduct(product, {
                through: {
                    productAmount,
                    price: product.price
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

        sendEmail(...emailData)

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
}

export default new OrderController()
