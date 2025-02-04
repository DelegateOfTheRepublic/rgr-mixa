import jwt from 'jsonwebtoken'
import { hashSync, compareSync, genSaltSync } from "bcrypt"

import {config} from "../config.js";
import { User, Token } from '../db/models.js';
import {sendEmail} from "../emailNotification.js";
import _ from "lodash";
import {ROLE_TYPES} from "../consts.js";

class AuthController {
    static generateActivationToken(email) {
        return jwt.sign({ email }, config.SECRET_KEY, { expiresIn: '24h' });
    };

    static sendActivationEmail(email) {
        const token = AuthController.generateActivationToken(email);
        const activationLink = `http://127.0.0.1:8000/api/auth/activate/${token}`;
        const emailData = {
            subject: 'Активация аккаунта',
            html: `<p>Для достпука к системе завершите регистрацию, перейдя по <a href="${activationLink}">ссылке</a></p>`,
            email,
        }

        sendEmail(emailData.subject, emailData.html, emailData.email)
    };

    async register(req, res) {
        const { email, pwd } = req.body;
        const isAdmin = _.get(req.body, 'isAdmin', false)

        const user = await User.findOne({ where: { email: email } });
        if (user) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует!' });
        }

        await User.create({
            email: email,
            password: hashSync(pwd, genSaltSync()),
            role: isAdmin? ROLE_TYPES.ADMIN : ROLE_TYPES.CUSTOMER
        });

        AuthController.sendActivationEmail(email);

        res.status(201).json({ message: 'Пользователь создан. Проверьте свою почту для активации!' });
    };

    async activate(req, res) {
        const { token } = req.params;
        try {
            const decoded = jwt.verify(token, config.SECRET_KEY);
            const user = await User.findOne({ where: { email: decoded.email } });

            if (!user) {
                return res.status(400).json({ message: 'Пользователь не найден!' });
            }

            user.isActivated = true;
            await user.save()

            res.status(200).send('Аккаунт успешно активирован!');
        } catch (error) {
            return res.status(400).json({ message: 'Неверный или просроченный токен!' });
        }
    };

    async login(req, res) {
        const { email, pwd } = req.body;

        const user = await User.findOne({ where: { email: email } });

        if (!user || !compareSync(pwd, user.password)) {
            return res.status(400).json({ message: 'Неверный логин или пароль!' });
        }

        const token = jwt.sign({ email }, config.SECRET_KEY, { expiresIn: '24h' })

        await Token.create({
            userId: user.id,
            token: token,
        })

        return res.status(200).json({ token: token })
    }
}

export default new AuthController()
