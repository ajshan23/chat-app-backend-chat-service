import { Request, Response } from 'express';
import User from '../models/userModel';
import { deleteFromS3, handleSingleFileUpload } from '../utils/uploader';


export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(404).json({ message: "No user found" })
            return;
        }
        const user = await User.findById(userId).select("-password -fcmToken")
        if (user) {
            res.status(200).json({ message: "User successfully fetched", user })
            return;
        } else {
            res.status(404).json({ message: "No user found" })
        }
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
}

export const updateProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(404).json({ message: "User not authenticated or user ID not found." });
            return;
        }
        if (!req.file) {
            res.status(400).json({ message: "No file provided" });
            return;
        }

        const result = await handleSingleFileUpload(req, req.file);
        if (!result.success) {
            res.status(400).json({ message: "File upload unsuccessful" });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        // Delete the existing profile picture from S3
        const deletePresentProfilePicture = await deleteFromS3(user.key as string);
        if (!deletePresentProfilePicture) {
            res.status(500).json({ message: "Error deleting previous profile picture" });
            return;
        }

        // Update the user's profile picture and key
        const { url, key } = result.uploadData;
        const updatedUser = await User.findByIdAndUpdate(userId, {
            profilePicture: url,
            key: key,
        });

        if (updatedUser) {
            res.status(200).json({ msg: "Profile picture uploaded successfully", success: true, profilePic: url });
        } else {
            res.status(500).json({ msg: "Failed to update user profile picture" });
        }
    } catch (error) {
        console.error("Error at updateProfilePicture function:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const updatebioAndUsername = async (req: Request, res: Response) => {
    const { bio, userName } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
        res.status(404).json({ messgae: "Not authencticated" });
        return;
    }
    try {
        const updatedUser = await User.findByIdAndUpdate(userId, {
            bio: bio,
            userName: userName
        }, { new: true })
        if (updatedUser) {
            res.status(200).json({ message: "Updated successfull" });
            return;
        } else {
            res.status(400).json({ message: "Update unsuccessfull" })
        }
    } catch (error) {
        console.error("Error at updatebioAndUsername function:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}