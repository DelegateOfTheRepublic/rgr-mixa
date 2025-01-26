import { Router } from "express";
import { categoryRouter } from "./category.js";
import { productRouter } from "./product.js"
import { cartRouter } from './cart.js'
import { orderRouter } from './order.js'
import { authRouter } from "./auth.js";
import { verifyToken } from "../middleware/token.js";


export const router = new Router()

router.use('/categories', verifyToken, categoryRouter)
router.use('/products', verifyToken, productRouter)
router.use('/cart', verifyToken, cartRouter)
router.use('/order', verifyToken, orderRouter)
router.use('/auth', authRouter)