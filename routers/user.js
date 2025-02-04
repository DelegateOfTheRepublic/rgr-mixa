import { Router } from "express";
import UserController from "../controllers/user.js";


export const userRouter = Router();

userRouter.get('/profile', UserController.profile)
userRouter.get('/cart', UserController.cart)
userRouter.get('/orders', UserController.orders)
userRouter.get('/wishlist', UserController.wishlist)
userRouter.post('/wishlist', UserController.addToWishlist)
userRouter.delete('/wishlist/:productId', UserController.removeFromWishlist)
