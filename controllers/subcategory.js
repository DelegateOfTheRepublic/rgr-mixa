import {Category, Product, Subcategory} from "../db/models.js";
import fs from "fs";
import _ from "lodash";


class SubcategoryController {
    async list(req, res) {
        const subcategories = await Subcategory.findAll()

        return res.status(200).json({ 'subcategories': subcategories })
    }

    async one(req, res) {
        const subcategory = await Subcategory.findByPk(req.params.id)
        const category = await Category.findByPk(subcategory.categoryId)
        let subcategoryJSON = {}

        for (let key of Object.keys(subcategory.toJSON())) {
            if (_.isEqual(key, 'categoryId')) {
                subcategoryJSON['category'] = {
                    id: category.id,
                    name: category.name,
                }
            } else {
                subcategoryJSON[key] = subcategory[key]
            }
        }

        return res.status(200).json({ 'subcategory': subcategoryJSON })
    }

    async create(req, res) {
        const subcategory = await Subcategory.create({
            name: req.body.name,
            categoryId: req.body.categoryId,
        })
        const categoryName = (await Category.findByPk(req.body.categoryId)).name

        fs.mkdir(
            `${process.cwd()}/uploads/${categoryName}/${subcategory.name}`,
            (err) => {}
        )

        return res.status(200).json({ 'subcategory': subcategory })
    }

    async update(req, res) {
        const { id } = req.params.id
        let subcategory = await Subcategory.findByPk(id)
        const categoryName = (await Category.findByPk(subcategory.categoryId)).name
        const oldSubcategoryPath = `${process.cwd()}/uploads/${categoryName}/${subcategory.name}`

        subcategory = await subcategory.update({
            name: req.body.name,
        })
        const newSubcategoryPath = `${process.cwd()}/uploads/${categoryName}/${subcategory.name}`

        fs.rename(oldSubcategoryPath, newSubcategoryPath, (err) => {})

        return res.status(200).json({ 'subcategory': subcategory })
    }

    async delete(req, res) {
        const subcategory = await Subcategory.findByPk(req.params.id)
        const hasProducts = !_.isEmpty(await Product.findAll({
            where: {
                subcategoryId: subcategory.id
            }
        }))

        if (hasProducts) {
            return res.status(400).json({ 'error': 'The subcategory is already in use' })
        }

        const categoryName = (await Category.findByPk(subcategory.categoryId)).name

        const subcategoryPath = `${process.cwd()}/uploads/${categoryName}/${subcategory.name}`
        fs.stat(subcategoryPath, (err) => {
            fs.rmdir(subcategoryPath, (err) => {})
        })

        return res.status(200).json('The subcategory has been successfully deleted!')
    }
}

export default new SubcategoryController()
