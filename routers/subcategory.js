import { Router } from 'express'
import SubcategoryController from '../controllers/subcategory.js'


export const subcategoryRouter = new Router()

subcategoryRouter.get('/', SubcategoryController.list)
subcategoryRouter.get('/:id', SubcategoryController.one)
subcategoryRouter.post('/', SubcategoryController.create)
subcategoryRouter.put('/:id', SubcategoryController.update)
subcategoryRouter.delete('/:id', SubcategoryController.delete)