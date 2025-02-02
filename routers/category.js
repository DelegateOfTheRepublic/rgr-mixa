import { Router } from 'express'
import CategoryController from '../controllers/category.js'


export const categoryRouter = new Router()

categoryRouter.get('/', CategoryController.list)
categoryRouter.get('/:id', CategoryController.one)
categoryRouter.post('/', CategoryController.create)
categoryRouter.put('/:id', CategoryController.update)
categoryRouter.delete('/:id', CategoryController.delete)