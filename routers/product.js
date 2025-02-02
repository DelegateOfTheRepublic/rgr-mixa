import { Router } from 'express'
import ProductController from '../controllers/product.js'
import {verifyProductField, verifyProductFields} from "../middleware/productFields.js";


export const productRouter = new Router()

productRouter.get('/', ProductController.list)
productRouter.get('/:id', ProductController.one)
productRouter.post('/', ProductController.create)
productRouter.put('/:id', ProductController.update)
productRouter.put('/:id/rating', ProductController.updateRating)
productRouter.delete('/:id', ProductController.delete)
