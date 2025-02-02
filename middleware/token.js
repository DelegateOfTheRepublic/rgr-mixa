import jwt from 'jwt-simple';
import {data} from '../nodemail.js'
import {User} from "../db/models.js";

export const verifyToken = async (req, res, next) => {
    const token = req.header('token');

    if (!token) {
        return res.status(401).json({message: 'Токен не предоставлен'});
    }

    try {
        const decoded = jwt.decode(token, data.SECRET_KEY);
        req.user = await User.findOne({
            where: {
                email: decoded.email
            }
        });
        next();
    } catch (error) {
        return res.status(400).json({message: 'Неверный или истёкший токен'});
    }
};