import jwt from 'jwt-simple';
import { data } from '../nodemail.js'

export const verifyToken = (req, res, next) => {
    const token = req.header('token');

    if (!token) {
        return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    try {
        const decoded = jwt.decode(token, data.SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(400).json({ message: 'Неверный или истёкший токен' });
    }
};