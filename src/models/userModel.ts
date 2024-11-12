import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    userName: string;
    password: string;
    email: string;
    fcmToken?: string;
    profilePicture?: string;
    key?: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    bio?: string;
}

const userSchema: Schema<IUser> = new Schema({
    userName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    fcmToken: {
        type: String,
    },
    profilePicture: {
        type: String,
        default: "",
    },
    key: {
        type: String,
        default: "",
    },
    email: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    bio: {
        type: String,
        default: ""
    }
}, { timestamps: true });

const User = mongoose.model<IUser>("User", userSchema)

export default User;