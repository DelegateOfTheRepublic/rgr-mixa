import { Router } from 'express'
import CategoryController from '../controllers/category.js'


export const categoryRouter = new Router()

categoryRouter.get('/', CategoryController.getCategories)
categoryRouter.get('/:id', CategoryController.getCategory)
categoryRouter.post('/', CategoryController.create)
categoryRouter.put('/:id', CategoryController.update)
categoryRouter.delete('/:id', CategoryController.deleteCategory)