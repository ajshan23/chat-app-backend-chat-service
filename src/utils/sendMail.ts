import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendOtpEmail = async (email: string, otp: string) => {
    const mailOptions = {
        from: process.env.SMTP_USER,       // sender address
        to: email,                         // list of receivers
        subject: 'Your OTP Code',          // Subject line
        text: `Your OTP code is ${otp}`,   // plain text body
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.error('Error sending OTP email:', error);
    }
};
