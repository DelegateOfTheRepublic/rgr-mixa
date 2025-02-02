import {Cart, Cart_Product, Order, Order_Product, Product, User} from "../db/models.js";

class OrderController {
    async getOrder(req, res) {
        const { id } = req.params
        let order = await Order.findOne({ where: { id }, include: Product })

        if (order) {
            return res.status(200).json({ 'order': order })
        }

        return res.status(404).json({ 'order': null })
    }

    async getOrders(req, res) {
        const user = await User.findOne({ where: { email: req.user.email } })
        const orders = await Order.findAll({ where: { userId: user.id }, include: Product })

        if (orders) {
            return res.status(200).json({ 'orders': orders })
        }

        return res.status(404).json({ 'orders': null })
    }

    async create(req, res) {
        const user = await User.findOne({ where: { email: req.user.email } })

        const cartId = await (user).dataValues.cartId
        const cart = await Cart.findByPk(cartId)

        const cartProducts = await Cart_Product.findAll({ where: { cartId } })

        let order = await Order.create({
            ...req.order,
            userId: user.id,
            totalCost: 0.0,
        })

        for (let cartProduct of cartProducts) {
            let product = await Product.findByPk(cartProduct.productId)

            await order.addProduct(product, { through: { productAmount: cartProduct.productAmount,
                    cost: cartProduct.cost
            } })
        }

        order.totalCost = cart.totalCost
        order = await order.save()

        order = await Order.findOne({ where: { id: order.id }, include: Product })

        return res.status(200).json({ 'order': order })
    }

    async update(req, res) {
        const { id } = req.params
        let order = await Order.findByPk(id)

        if (order.status !== 'собирается') {
            return res.status(400).json({ 'error': `Order №${id} already packed` })
        }

        await order.update({
            shippingAddressId: req.order.shippingAddressId,
        })

        order = await Order.findOne({ where: { id }, include: Product })

        return res.status(200).json({ 'order': order })
    }

    async delete(req, res) {
        const { id } = req.params
        await Order.destroy({ where: { id } })

        return res.status(200).json({ 'success': true })
    }
}

export default new OrderController()
