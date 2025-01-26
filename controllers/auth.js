import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { hashSync, compareSync, genSaltSync } from "bcrypt"

import { data } from '../nodemail.js'
import { User, Token } from '../db/models.js';

class AuthController {
    static generateActivationToken(email) {
        return jwt.sign({ email }, data.SECRET_KEY, { expiresIn: '24h' });
    };

    static sendActivationEmail(email) {
        const token = AuthController.generateActivationToken(email);
        const activationLink = `http://localhost:8000/api/auth/activate/${token}`;

        const transporter = nodemailer.createTransport({
            host: 'smtp.mail.ru',
            port: 465,
            auth: {
                user: data.EMAIL,
                pass: data.PASSWORD,
            },
        });

        const mailOptions = {
            from: data.EMAIL,
            to: email,
            subject: 'Активация аккаунта',
            html: `<p>Для достпука к системе завершите регистрацию, перейдя по <a href="${activationLink}">ссылке</a></p>`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Ошибка отправки письма:', error);
            } else {
                console.log('Письмо отправлено:', info.response);
            }
        });
    };

    async register(req, res) {
        const { email, pwd } = req.body;

        const user = await User.findOne({ where: { email: email } });
        if (user) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует!' });
        }

        await User.create({
            email: email,
            password: hashSync(pwd, genSaltSync())
        });

        AuthController.sendActivationEmail(email);

        res.status(201).json({ message: 'Пользователь создан. Проверьте свою почту для активации!' });
    };

    async activate(req, res) {
        const { token } = req.params;
        try {
            const decoded = jwt.verify(token, data.SECRET_KEY);
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

        const token = jwt.sign({ email }, data.SECRET_KEY, { expiresIn: '24h' })

        await Token.create({
            userId: user.id,
            token: token,
        })

        return res.status(200).json({ token: token })
    }
}

export default new AuthController()
