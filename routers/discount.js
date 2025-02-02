import { Router } from "express";
import DiscountController from "../controllers/discount.js"


export const discountRouter = new Router();

discountRouter.get('/', DiscountController.list)
discountRouter.post('/', DiscountController.add)
discountRouter.put('/:id', DiscountController.update)
discountRouter.delete('/:id', DiscountController.remove)
