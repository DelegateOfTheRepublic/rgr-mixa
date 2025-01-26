import { Category } from "../db/models.js";

class CategoryController {
    async getCategories(req, res) {
        const categories = await Category.findAll()
        res.status(200).json(categories)
    }

    async getCategory(req, res) {
        const category = await Category.findOne({ where: { id: req.params.id } })
        return res.status(200).json(category)
    }

    async create(req, res) {
        const newCategory = {
            name: req.body.name
        }

        const category = await Category.create(newCategory)
        return res.status(201).json(category)
    }

    async update(req, res) {
        await Category.update({
            name: req.body.name
        },
        {
            where: {
                id: req.params.id
            }
        })

        const category = await Category.findByPk(req.params.id)

        return res.status(200).json(category)
    }

    async deleteCategory(req, res) {
        await Category.destroy({
            where: {
                id: req.params.id
            }
        })

        return res.status(200).json('The category has been successfully deleted!')
    }
}

export default new CategoryController()
