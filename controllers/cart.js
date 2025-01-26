import {Cart, Cart_Product, Product, User} from "../db/models.js"
import _ from "lodash";

export async function updateTotalCost(product) {
    const cartProducts = await Cart_Product.findAll({ where: { productId: product.id } })
    for (let cartProduct of cartProducts) {
        let oldCartProductCost = cartProduct.cost
        cartProduct.cost = cartProduct.productAmount * product.price
        await cartProduct.save()

        const cart = await Cart.findByPk(cartProduct.cartId)
        cart.totalCost = cart.totalCost - oldCartProductCost + cartProduct.cost
        await cart.save()
    }
}

class CartController {
    async getCart(req, res) {
        let cart;
        const user = await User.findOne({
            where: {
                email: req.user.email,
            }
        })

        if (_.isNull(user.cartId)) {
            cart = await Cart.create()
            user.cartId = cart.id
            await user.save()
        }

        cart = await Cart.findOne({ where: { id: user.cartId }, include: Product })

        if (cart) {
            return res.status(200).json({ 'cart': cart })
        }

        return res.status(404).json({ 'cart': null })
    }

    async update(req, res) {
        const { productId, amount } = req.body
        const cartId = await (await User.findOne({ where: { email: req.user.email } })).dataValues.cartId
        let cart = await Cart.findByPk(cartId)
        const product = await Product.findByPk(productId)
        const cartProduct = await Cart_Product.findOne({ where: { cartId, productId } })

        if (_.isNull(cartProduct)) {
            await cart.addProduct(product, { through: { productAmount: amount, cost: product.price * amount } })
            cart.totalCost = cart.totalCost + product.price * amount
        } else {
            cartProduct.productAmount = cartProduct.productAmount + _.toNumber(amount)
            const oldCartProductCost = cartProduct.cost
            cartProduct.cost = cartProduct.productAmount * product.price
            await cartProduct.save()

            cart.totalCost = cart.totalCost - oldCartProductCost + cartProduct.cost

            if (cartProduct.productAmount === 0) {
                await cart.removeProduct(productId)
            }
        }
        await cart.save()
        cart = await Cart.findOne({ where: { id: cartId }, include: Product })

        return res.status(200).json({ 'cart': cart })
    }

    async delete(req, res) {
        const { productId } = req.query
        const product = await Product.findByPk(productId)
        const cartId = await (await User.findOne({ where: { email: req.user.email } })).dataValues.cartId
        let cart = await Cart.findByPk(cartId)

        const cartProduct = await Cart_Product.findByPk(productId)
        cart.totalCost -= cartProduct.cost
        await cart.removeProduct(productId)
        await cart.save()

        cart = await Cart.findOne({ where: { id: cartId }, include: Product })

        return res.status(200).json({ 'cart': cart })
    }
}

export default new CartController()
