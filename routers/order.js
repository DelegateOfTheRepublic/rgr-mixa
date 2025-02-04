import { Router } from 'express'
import OrderController from '../controllers/order.js'
import {verifyAdmin} from "../middleware/verifyRole.js";


export const orderRouter = new Router()

orderRouter.get('/', OrderController.list)
orderRouter.get('/sales-report', verifyAdmin, OrderController.salesReport)
orderRouter.post('/', OrderController.create)
orderRouter.post('/:id/payment', OrderController.payment)
orderRouter.put('/:id', OrderController.update)
orderRouter.put('/:id/status', OrderController.changeStatus)
orderRouter.put('/:id/arrived', OrderController.arrived)
orderRouter.put('/:id/receive', OrderController.receive)
orderRouter.delete('/:id', OrderController.cancle)
