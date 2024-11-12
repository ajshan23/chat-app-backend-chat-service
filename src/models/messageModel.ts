import mongoose, { Schema, Document } from 'mongoose';

// Define types for the message schema
export interface IMessage extends Document {
    conversationId: mongoose.Types.ObjectId; // Reference to the associated Conversation or GroupConversation
    senderId: mongoose.Types.ObjectId;       // Sender of the message
    content: string;                          // Message content (text, image, etc.)
    timestamp: Date;                          // Timestamp of when the message was sent
    isRead: boolean;                          // Whether the message has been read (for normal chat)
    type: 'text' | 'image' | 'video';         // Type of message (e.g., text, image, video)
    seenBy: mongoose.Types.ObjectId[];       // List of users who have seen the message (for group chat)
    conversationType: 'normal' | 'group'; // The type of conversation (normal or group)
}

// Define the Message schema
const MessageSchema: Schema<IMessage> = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'conversationType',  // Dynamically refers to either Conversation or GroupConversation
    },
    senderId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    isRead: {
        type: Boolean,
        default: false,  // Default is false for normal chat
    },
    type: {
        type: String,
        enum: ['text', 'image', 'video'],
        default: 'text',  // Default message type is text
    },
    seenBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User',  // Users who have seen the message in group chats
    }],
    conversationType: {
        type: String,
        enum: ['normal', 'group'],
        required: true,  // Ensure it's either a normal conversation or a group conversation
    }
}, { timestamps: true });  // Automatically handle createdAt and updatedAt timestamps

// Create and export the Message model
const Message = mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
