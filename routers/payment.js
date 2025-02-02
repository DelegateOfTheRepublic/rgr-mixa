import { Router } from "express";
import PaymentController from "../controllers/payment.js"


export const paymentRouter = Router();

paymentRouter.post('/checkout', PaymentController.goCheckout)
