import { Router } from "express";
import { categoryRouter } from "./category.js";
import { productRouter } from "./product.js"
import { cartRouter } from './cart.js'
import { orderRouter } from './order.js'
import { authRouter } from "./auth.js";
import { verifyToken } from "../middleware/token.js";
import {subcategoryRouter} from "./subcategory.js";
import {userRouter} from "./user.js";
import {discountRouter} from "./discount.js";


export const router = new Router()

router.use('/categories', categoryRouter)
router.use('/subcategories', subcategoryRouter)
router.use('/products', productRouter)
router.use('/cart', cartRouter)
router.use('/order', orderRouter)
router.use('/auth', authRouter)
router.use('/user', userRouter)
router.use('/discounts', discountRouter)
