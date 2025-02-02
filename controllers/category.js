import { Category, Product } from "../db/models.js";
import fs from "fs";
import _ from "lodash";

class CategoryController {
    async list(req, res) {
        const categories = await Category.findAll()

        res.status(200).json(categories)
    }

    async one(req, res) {
        const category = await Category.findOne({ where: { id: req.params.id } })

        return res.status(200).json(category)
    }

    async create(req, res) {
        const newCategory = {
            name: req.body.name
        }

        const category = await Category.create(newCategory)

        fs.mkdir(`${process.cwd()}/uploads/${category.name}`, (err) => {})

        return res.status(200).json(category)
    }

    async update(req, res) {
        let category = await Category.findByPk(req.params.id)
        const oldCategoryPath = `${process.cwd()}/uploads/${category.name}`

        category = await category.update({
            name: req.body.name,
        })
        const newCategoryPath = `${process.cwd()}/uploads/${req.body.name}`

        fs.rename(oldCategoryPath, newCategoryPath, (err) => {})

        return res.status(200).json(category)
    }

    async delete(req, res) {
        const category = await Category.findByPk(req.params.id)

        const hasProducts = !_.isEmpty(await Product.findAll({
            where: {
                categoryId: category.id
            }
        }))

        if (hasProducts) {
            return res.status(400).json({ 'error': 'The category is already in use' })
        }

        const categoryPath = `${process.cwd()}/uploads/${category.name}`
        fs.stat(categoryPath, (err) => {
            fs.rmdir(categoryPath, (err) => {})
        })

        return res.status(200).json('The category has been successfully deleted!')
    }
}

export default new CategoryController()
