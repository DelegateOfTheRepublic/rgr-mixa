import { Router } from 'express'
import ProductController from '../controllers/product.js'
import {verifyProductField, verifyProductFields} from "../middleware/productFields.js";


export const productRouter = new Router()

productRouter.get('/', ProductController.getProducts)
productRouter.get('/:id', ProductController.getProduct)
productRouter.post('/', verifyProductFields, ProductController.create)
productRouter.put('/:id', verifyProductField, ProductController.update)
productRouter.delete('/:id', ProductController.delete)
