import {Cart, Product} from "../db/models.js";
import _ from "lodash";

class UserController {
    async profile(req, res) {
        return res.status(200).json({ 'profile': req.user })
    }

    async cart(req, res) {
        let cart = await req.user.getCart()

        if (_.isNull(cart)) {
            cart = await Cart.create()

            await req.user.update({
                cartId: cart.id,
            })
        }

        return res.status(200).json(
            {
                'cart': {
                    user: req.user.email,
                    cart,
                }
            }
        )
    }

    async orders(req, res) {
        return res.status(200).json({ 'orders': await req.user.getOrders() })
    }

    async wishlist(req, res) {
        return res.status(200).json({ 'wishlist': await req.user.getProducts() })
    }

    async addToWishlist(req, res) {
        const product = await Product.findByPk(req.body.productId)
        await req.user.addProduct(product)

        return res.status(200).json({ 'wishlist': await req.user.getProducts() })
    }

    async removeFromWishlist(req, res) {
        const product = await Product.findByPk(req.params.productId)
        await req.user.removeProduct(product)

        return res.status(200).json({ 'wishlist': await req.user.getProducts() })
    }
}

export default new UserController()
