import { Router } from "express";
import { getConversations, getMessageOfAConversation, sendMessage } from "../controllers/chatController";
import protect from "../middleware/authMiddleware";

const router = Router();


router.route("/send-message").post(protect, sendMessage);
router.route("/get-conversations").get(protect, getConversations)
router.route("/get-messages/:conversationId").get(protect, getMessageOfAConversation)
export default router;