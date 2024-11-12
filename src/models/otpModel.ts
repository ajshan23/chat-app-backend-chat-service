import mongoose, { Schema } from "mongoose";
import { Types } from "mongoose";
import { Document } from "mongoose";

export interface IOtp extends Document {
    otp: string;
    userId: Types.ObjectId;
    otpExpiry: Date;
}
const otpSchema: Schema<IOtp> = new mongoose.Schema({
    otp: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    otpExpiry: {
        type: Date,
        default: () => new Date(Date.now() + 15 * 60 * 1000),
    }
}, { timestamps: true })

const OtpModel = mongoose.model<IOtp>("Otp", otpSchema);
export default OtpModel;