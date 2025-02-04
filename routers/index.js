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
import {verifyAdmin} from "../middleware/verifyRole.js";


export const router = new Router()

router.use('/categories', verifyToken, categoryRouter)
router.use('/subcategories', verifyToken, subcategoryRouter)
router.use('/products', verifyToken, productRouter)
router.use('/cart', verifyToken, cartRouter)
router.use('/orders', verifyToken, orderRouter)
router.use('/auth', authRouter)
router.use('/users', verifyToken, userRouter)
router.use('/discounts', verifyToken, verifyAdmin, discountRouter)
