import path from "path"
import _ from "lodash"
import {Cart_Product, Order_Product, Product} from "../db/models.js";
import CartController, {updateTotalCost} from "./cart.js"
import OrderController from "./order.js"


class ProductController {
    async getProducts(req, res) {
        const products = await Product.findAll()
        res.status(200).json(products)
    }

    async getProduct(req, res) {
        const product = await Product.findOne({ where: { id: req.params.id } })
        return res.status(200).json(product)
    }

    async create(req, res) {
        let imageName = `${req.product.type}.jpg`
        const __dirname__ = path.resolve()

        await req.product.image.mv(path.resolve(__dirname__, 'uploads', imageName))

        req.product["image"] = `/uploads/${imageName}`

        const product = await Product.create(req.product)
        return res.status(201).json(product)
    }

    async update(req, res) {
        const oldProduct = await Product.findByPk(req.params.id)

        const image = req.product.image
        let imageName = `${oldProduct.type}.jpg`

        if (!_.isUndefined(image)) {
            const __dirname__ = path.resolve()

            await image.mv(path.resolve(__dirname__, 'uploads', imageName))
        }

        req.product.image = `/uploads/${imageName}`

        await Product.update(req.product,
        {
            where: {
                id: req.params.id
            }
        })

        const product = await Product.findByPk(req.params.id)

        if (product.price !== oldProduct.price) {
            await updateTotalCost(product)
            await OrderController.updateTotalCost(product)
        }

        return res.status(200).json(product)
    }

    async delete(req, res) {
        const { id } = req.params
        const cartProduct = await Cart_Product.findOne({ where: { productId: id } })
        const orderProduct = await Order_Product.findOne({ where: { productId: id } })

        if (!_.isNull(cartProduct) || !_.isNull(orderProduct)) {
            return res.status(400).json({ 'error': 'Product is already in use' })
        }

        await Product.destroy({
            where: {
                id
            }
        })

        return res.status(200).json('The product has been successfully deleted!')
    }
}

export default new ProductController()
