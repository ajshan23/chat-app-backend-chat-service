import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Conversation from '../models/conversation';
import Message from '../models/messageModel';
import { IUser } from '../models/userModel';
import { getRecieverSocketId, io } from '../config/socket';
interface SendMessageRequestBody {
    senderId: string;
    receiverId?: string; // Optional if it's a group chat
    messageContent: string;
    conversationId?: string;
    type: 'normal' | 'group';
}

export const sendMessage = async (req: Request<{}, {}, SendMessageRequestBody>, res: Response): Promise<void> => {
    const { messageContent, conversationId, receiverId, type } = req.body;
    const senderId = req.user?.userId;

    if (!messageContent) {
        res.status(400).json({ message: 'Message content cannot be empty' });
        return;
    }
    if (type === 'normal' && !receiverId) {
        res.status(400).json({ message: 'ReceiverId is required for normal chat messages' });
        return;
    }

    try {
        let conversation: any;

        if (!conversationId && type === 'normal' && receiverId) {
            conversation = await Conversation.findOne({
                type: 'normal',
                participants: { $all: [new Types.ObjectId(senderId), new Types.ObjectId(receiverId)] },
            });

            if (!conversation) {
                conversation = new Conversation({
                    type: 'normal',
                    participants: [new Types.ObjectId(senderId), new Types.ObjectId(receiverId)],
                    lastMessage: messageContent,
                    updatedAt: new Date(),
                });
                await conversation.save();
            }
        } else if (conversationId) {
            conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                res.status(404).json({ message: 'Conversation not found' });
                return;
            }
        } else if (type === 'group') {
            res.status(400).json({ message: 'ConversationId is required for group messages' });
            return;
        }

        if (!conversation) {
            res.status(400).json({ message: 'Failed to find or create conversation' });
            return
        }

        if (!conversation.participants.includes(new Types.ObjectId(senderId))) {
            res.status(403).json({ message: 'Sender is not part of this conversation' });
            return
        }

        const newMessage = new Message({
            conversationId: conversation._id,
            senderId: new Types.ObjectId(senderId),
            content: messageContent,
            timestamp: new Date(),
            conversationType: conversation.type,
            isRead: false,
            type: 'text',
        });
        await newMessage.save();

        conversation.lastMessage = newMessage.content;
        conversation.updatedAt = new Date();
        await conversation.save();

        const participantIds = conversation.participants.filter(
            (participant: Types.ObjectId) => participant.toString() !== senderId?.toString()
        );

        for (const participantId of participantIds) {
            const receiverSocketId = await getRecieverSocketId(participantId.toString());
            if (receiverSocketId) {
                process.nextTick(() => {
                    io.to(receiverSocketId).emit("newMessage", {
                        conversationId: conversation._id,
                        message: {
                            ...newMessage.toObject(),
                            messageId: newMessage._id, // Add the renamed property
                            _id: undefined,           // Optionally remove the original _id
                        },
                        participantId: senderId,
                        participantName: req.user?.username,
                        participantImage: req.user?.profilePicture,
                    });
                });
            }
        }

        res.status(200).json({
            conversationId: conversation._id,
            message: {
                ...newMessage.toObject(),
                messageId: newMessage._id, // Add the renamed property
                _id: undefined,           // Optionally remove the original _id
            },
            updatedAt: conversation.updatedAt,
        });

    } catch (error: any) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
};




export const getConversations = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
        res.status(400).json({ message: 'User not authenticated' });
        return;
    }

    try {
        const pageNumber = parseInt(page as string, 10);
        const pageLimit = parseInt(limit as string, 10);

        if (isNaN(pageNumber) || pageNumber <= 0) {
            res.status(400).json({ message: 'Invalid page number' });
            return;
        }

        if (isNaN(pageLimit) || pageLimit <= 0) {
            res.status(400).json({ message: 'Invalid limit' });
            return;
        }

        const skip = (pageNumber - 1) * pageLimit;

        // Fetch all conversations where the user is a participant
        const conversations = await Conversation.find({ participants: userId })
            .populate<{ participants: IUser[] }>({
                path: 'participants',
                select: 'userName profilePicture',
            })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(pageLimit);

        if (conversations.length === 0) {
            res.status(404).json({ message: 'No conversations found' });
            return;
        }

        // Process the conversation list to include appropriate details with unseen message count
        const formattedConversations = await Promise.all(
            conversations.map(async (conversation) => {
                let unseenMessageCount = 0;

                if (conversation.type === 'group') {
                    // Count unseen messages for group conversations
                    unseenMessageCount = await Message.countDocuments({
                        conversationId: conversation._id,
                        conversationType: 'group',
                        seenBy: { $ne: new Types.ObjectId(userId) },
                    });

                    return {
                        conversationId: conversation._id,
                        type: 'group',
                        groupName: conversation.groupName || '',
                        groupImage: conversation.groupImage || '',
                        unseenMessageCount,
                        lastMessage: conversation.lastMessage || '',
                        updatedAt: conversation.updatedAt,
                    };
                } else {
                    // For normal (one-on-one) conversations
                    const otherParticipant = conversation.participants.find(
                        (participant) => participant._id.toString() !== new Types.ObjectId(userId).toString()
                    );

                    // Count unseen messages for normal (one-on-one) conversations
                    unseenMessageCount = await Message.countDocuments({
                        conversationId: conversation._id,
                        conversationType: 'normal',
                        senderId: { $ne: new Types.ObjectId(userId) }, // Only count messages not sent by the user
                        isRead: false,
                    });

                    return {
                        conversationId: conversation._id,
                        type: 'normal',
                        participantName: otherParticipant?.userName || 'Unknown User',
                        participantImage: otherParticipant?.profilePicture || '',
                        participantId: otherParticipant?._id,
                        unseenMessageCount,
                        lastMessage: conversation.lastMessage || '',
                        updatedAt: conversation.updatedAt,
                    };
                }
            })
        );

        // Return the sorted and paginated list of conversations
        res.status(200).json({
            message: 'Conversations fetched successfully',
            conversations: formattedConversations,
            currentPage: pageNumber,
            totalConversations: formattedConversations.length,
            totalPages: Math.ceil(formattedConversations.length / pageLimit),
        });
    } catch (error: any) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Failed to fetch conversations', error: error.message });
    }
};



export const getMessageOfAConversation = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const { limit = 40, until } = req.query;

    if (!userId) {
        res.status(400).json({ message: 'User not authenticated' });
        return;
    }

    if (!conversationId) {
        res.status(400).json({ message: 'Conversation ID is required' });
        return;
    }

    try {
        const pageLimit = parseInt(limit as string, 10);
        const untilTimestamp = until ? new Date(until as string) : null;

        if (isNaN(pageLimit) || pageLimit <= 0) {
            res.status(400).json({ message: 'Invalid limit' });
            return;
        }

        // Prepare the query to fetch messages older than the given timestamp
        const messageQuery: any = { conversationId: new Types.ObjectId(conversationId) };
        if (untilTimestamp) {
            messageQuery['timestamp'] = { $lt: untilTimestamp };
        }

        // Fetch and sort messages
        const messages = await Message.find(messageQuery)
            .sort({ timestamp: -1 }) // Latest messages first
            .limit(pageLimit)
            .populate('senderId', 'userName profilePicture');

        // Format the response
        const formattedMessages = messages.map((message: any) => ({
            messageId: message._id,
            senderId: message.senderId._id,
            senderName: message.senderId?.userName,
            senderImage: message.senderId?.profilePicture || '',
            content: message.content,
            type: message.type,
            timestamp: message.timestamp,
            isRead: message.isRead,
            seenBy: message.seenBy,
        }));

        res.status(200).json({
            message: 'Messages fetched successfully',
            messages: formattedMessages,
        });
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
    }
};

