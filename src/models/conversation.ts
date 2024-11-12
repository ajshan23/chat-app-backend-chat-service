import mongoose, { Schema, Document } from 'mongoose';

// Conversation Type Enum
type ConversationType = 'normal' | 'group';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[]; // Users involved in the conversation
  admin?: mongoose.Types.ObjectId;          // Optional Admin for group chat
  groupName?: string;                       // Optional Group name
  lastMessage?: string;                     // Last message in the conversation
  type: ConversationType;
  groupImage?: string;                  // Type of conversation ('normal' or 'group')
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema<IConversation> = new Schema({
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Admin is only required for group chats
  },
  groupName: {
    type: String,
    default: null, // Group name is only for group chats
  },
  groupImage: {
    type: String,
    default: ""
  },
  lastMessage: {
    type: String,
  },
  type: {
    type: String,
    enum: ['normal', 'group'],
    default: "normal",
    required: true,
  },
}, { timestamps: true });

const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
export default Conversation;
