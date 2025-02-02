import { Router } from 'express'
import CartController from '../controllers/cart.js'


export const cartRouter = new Router()

cartRouter.post('/products/add', CartController.addProduct)
cartRouter.delete('/products/:productId/remove', CartController.removeProduct)
cartRouter.put('/products/:productId/update', CartController.updateProductAmount)
