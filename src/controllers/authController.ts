// userController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User, { IUser } from '../models/userModel'; // Adjust the path according to your project structure
import Joi from 'joi';
import OtpModel, { IOtp } from '../models/otpModel';
import { sendOtpEmail } from '../utils/sendMail';
import jwt from "jsonwebtoken";
const generateOTP = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Generate a 4-digit code
};
// Define a schema for user registration
const userSchema = Joi.object({
    userName: Joi.string().required().messages({
        'string.empty': 'Username is required',
    }),
    email: Joi.string().email().required().messages({
        'string.empty': 'Valid email is required',
    }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Password must be at least 6 characters long',
        'string.min': 'Password must be at least 6 characters long',
    }),
    fcmToken: Joi.string().optional(),
    profilePicture: Joi.string().optional(),
});
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Valid email is required',
    }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters long',
    }),
});

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    // Validate input
    const { error } = userSchema.validate(req.body);
    if (error) {
        res.status(400).json({ errors: error.details.map(err => err.message) });
        return;
    }

    const { userName, password, email, fcmToken, profilePicture } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser: IUser = new User({
            userName,
            password: hashedPassword,
            email,
            fcmToken,
            profilePicture,
        });

        // Save user to the database
        await newUser.save();
        const otp = generateOTP();
        const otpData: IOtp = await OtpModel.create({
            otp: otp,
            userId: newUser._id,
        });
        const emailsent = await sendOtpEmail(email, otp);

        if (otp) {
            res.status(201).json({ message: 'We have sent an email to you preffered mail inorder to verify it is you', user: newUser });
            return;
        } else {
            res.status(500).json({ message: 'Internal server error' });
        }

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {

        const { userId, otp } = req.body;
        const storedOtp = await OtpModel.findOne({ userId })
        if (!storedOtp || storedOtp.otp !== otp || Date.now() > storedOtp.otpExpiry.getTime()) {
            res.status(400).json({ message: 'Invalid or expired OTP' });
            return;
        }
        await OtpModel.deleteMany({ userId });
        const updatedUser = await User.findByIdAndUpdate(userId, { isVerified: true }, { new: true });
        if (updatedUser) {
            res.status(200).json({ message: "User verified successfully" })
            return;
        } else {
            res.status(500).json({ message: 'Internal server error' });
            return;
        }


    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
}


const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Use a strong secret in production


export const loginUser = async (req: Request, res: Response): Promise<void> => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        res.status(400).json({ errors: error.details.map(err => err.message) });
        return;
    }

    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Check if the user is verified
        if (!user.isVerified) {
            // Generate OTP
            const otp = generateOTP()
            const otpExpiry = Date.now() + 1500000;

            // Save OTP in the database
            await OtpModel.updateOne(
                { userId: user._id },
                { otp, otpExpiry },
                { upsert: true } // Create a new document if it doesn't exist
            );
            await sendOtpEmail(email, otp);

            // Send OTP via email


            res.status(203).json({
                message: 'User not verified. Please check your email for the OTP to verify your account.',
                user: {
                    _id: user._id,
                    email: user.email,
                }
            });
            return;
        }

        // Compare the password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate a JWT token
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
            expiresIn: '1d', // Token expires in 1 day
        });

        res.status(200).json({ message: 'Login successful', token }); // Include the token in the response
        return;
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
};