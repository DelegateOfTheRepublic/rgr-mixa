import express from 'express';
import AuthController from '../controllers/auth.js'

export const authRouter = express.Router();

authRouter.post('/register', AuthController.register);
authRouter.get('/activate/:token', AuthController.activate);
authRouter.post('/login', AuthController.login)
