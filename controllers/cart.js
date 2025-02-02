import {Cart_Product, Product} from "../db/models.js"


class CartController {
    async addProduct(req, res) {
        const { productId, amount } = req.body
        let cart = await req.user.getCart()
        const product = await Product.findByPk(productId)

        await cart.addProduct(product, { trough: { productAmount: amount, cost: product.price * amount } })
        cart = await req.user.getCart()

        return res.status(200).json({ 'cart': cart })
    }

    async removeProduct(req, res) {
        let cart = await req.user.getCart()
        const product = await Product.findByPk(req.params.productId)

        cart.totalCost -= await cart.getProductCost(product.id)
        await cart.save()
        await cart.removeProduct(product)
        cart = await req.user.getCart()

        return res.status(200).json({ 'cart': cart })
    }

    async updateProductAmount(req, res) {
        const { amount } = req.body
        const cart = await req.user.getCart()
        const product = await Product.findByPk(req.params.productId)
        let cartProduct = await Cart_Product.findOne({
            where: {
                cartId: cart.id,
                productId: product.id,
            }
        })

        if (cartProduct.productAmount + amount === 0) {
            cart.totalCost -= cartProduct.cost
            await cart.save()
            await cartProduct.destroy()

            return res.status(200).json({ 'cartProduct': null })
        }

        cart.totalCost -= cartProduct.cost
        cartProduct.productAmount += amount
        cartProduct.cost = product.price * cartProduct.productAmount
        cart.totalCost += cartProduct.cost
        cartProduct = await cartProduct.save()
        await cart.save()

        return res.status(200).json({ cartProduct })
    }
}

export default new CartController()
