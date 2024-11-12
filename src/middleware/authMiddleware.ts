import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/userModel';

const SECRET_KEY = process.env.JWT_SECRET || "your_jwt_secret";  // Replace with your actual secret key

// Middleware function to verify the JWT token
const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {  // Make sure the return type is void
    const authHeader = req.headers['authorization'];
    // console.log(authHeader);

    if (!authHeader) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];  // Extract the token part after "Bearer"

    if (!token) {
        res.status(401).json({ message: 'Token missing' });
        return;
    }

    try {
        // Verify the token using JWT
        const decoded = jwt.verify(token, SECRET_KEY) as { id: string };  // Type assertion to ensure we have the 'id' field in decoded object

        // Find user by decoded id
        const user = await User.findById(decoded.id).select("_id email userName profilePicture");

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Attach the user to the request object so that it's available in the route handlers
        req.user = {
            email: user.email,
            userId: user._id,
            username: user.userName,
            profilePicture: user.profilePicture || "",
        };

        next();  // Proceed to the next middleware/handler
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Not authenticated, token failed' });
        return
    }
};

export default protect;
