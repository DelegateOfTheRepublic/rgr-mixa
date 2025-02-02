import path from "path"
import _ from "lodash"
import {Cart, Cart_Product, Category, Order, Order_Product, Product, Subcategory, Rating} from "../db/models.js";
import {RATING_STARS} from "../consts.js";


class ProductController {
    async list(req, res) {
        const products = await Product.findAll()

        res.status(200).json(products)
    }

    async one(req, res) {
        const product = await Product.findByPk(req.params.id)
        const category = await product.getCategory()
        const subcategory = await product.getSubcategory()
        const rating = await product.getRating()

        const jsonProduct = {}

        for (let key of Object.keys(product.toJSON())) {
            if (_.isEqual(key, 'categoryId')) {
                jsonProduct['category'] = {
                    id: category.id,
                    name: category.name
                }
            } else if (_.isEqual(key, 'subcategoryId')) {
                jsonProduct['subcategoryId'] = {
                    id: subcategory.id,
                    name: subcategory.name,
                }
            } else {
                jsonProduct[key] = product[key]
            }
        }

        jsonProduct.rating = rating

        return res.status(200).json(jsonProduct)
    }

    async create(req, res) {
        const { categoryId, subcategoryId } = req.body
        const categoryName = (await Category.findByPk(categoryId)).name
        const subcategoryName = (await Subcategory.findByPk(subcategoryId)).name

        let imageName = `${req.body.model}.jpg`
        const __dirname__ = path.resolve()
        const imagePath = `uploads/${categoryName}/${subcategoryName}`

        await req.files.image.mv(path.resolve(__dirname__, imagePath, imageName))

        req.body["image"] = `/${imagePath}/${imageName}`

        const product = await Product.create(req.body)
        await Rating.create({
            productId: product.id,
        })

        return res.status(201).json(product)
    }

    async update(req, res) {
        let product = await Product.findByPk(req.params.id)
        const oldPrice = product.price

        const image = _.get(req.files, 'image', null)
        let imageName = `${product.model}.jpg`
        const imagePath = await product.getImagePath()

        if (!_.isNull(image)) {
            const __dirname__ = path.resolve()

            await image.mv(path.resolve(__dirname__, imagePath, imageName))
        }

        req.body.image = `/${imagePath}/${imageName}`

        product = await product.update(...req.body)

        if (product.price !== oldPrice) {
            await Cart.updateTotalCosts(product)
        }

        return res.status(200).json(product)
    }

    async updateRating(req, res) {
        const { star, score } = req.body

        let rating = await Rating.findOne({
            where: {
                productId: req.params.id,
            }
        })

        rating.stars[RATING_STARS[_.toUpper(star)] - 1] += _.toNumber(score)
        rating = await rating.save()

        return res.status(200).json({ 'rating': rating })
    }

    async delete(req, res) {
        const { id } = req.params
        const cartProduct = await Cart_Product.findOne({ where: { productId: id } })
        const orderProduct = await Order_Product.findOne({ where: { productId: id } })
        const product = await Product.findByPk(id)

        if (!_.isNull(cartProduct) || !_.isNull(orderProduct)) {
            if (product.stockQuantity === 0) {
                return res.status(400).json({ 'error': 'The product is out of stock' })
            }

            return res.status(400).json({ 'error': 'The product is already in use' })
        }

        await product.destroy()

        return res.status(200).json('The product has been successfully deleted!')
    }
}

export default new ProductController()
