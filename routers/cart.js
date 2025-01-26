import { Router } from 'express'
import CartController from '../controllers/cart.js'


export const cartRouter = new Router()

cartRouter.get('/', CartController.getCart)
cartRouter.put('/', CartController.update)
cartRouter.delete('/', CartController.delete)
