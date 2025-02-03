import nodemailer from 'nodemailer';
import {config} from "./config.js";

export const sendEmail = (subject, html, email) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.mail.ru',
        port: 465,
        auth: {
            user: config.EMAIL,
            pass: config.PASSWORD,
        },
    });

    const mailOptions = {
        from: config.EMAIL,
        to: email,
        subject,
        html,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Ошибка отправки письма:', error);
        } else {
            console.log('Письмо отправлено:', info.response);
        }
    });
}
