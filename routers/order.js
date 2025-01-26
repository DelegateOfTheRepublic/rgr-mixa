import { Router } from 'express'
import OrderController from '../controllers/order.js'
import { verifyOrderFields, verifyOrderField } from "../middleware/orderFields.js";


export const orderRouter = new Router()

orderRouter.get('/:id', OrderController.getOrder)
orderRouter.get('/', OrderController.getOrders)
orderRouter.post('/', verifyOrderFields, OrderController.create)
orderRouter.put('/:id', verifyOrderField, OrderController.update)
orderRouter.delete('/:id', OrderController.delete)
