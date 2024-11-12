// userRoutes.ts
import { Router } from 'express';
import protect from '../middleware/authMiddleware';
import { getProfile, updatebioAndUsername, updateProfilePicture } from '../controllers/profileController';
import upload from '../config/MulterConfig';
// Adjust the path according to your project structure

const router = Router();

router.route("/").get(protect, getProfile)
router.route("/profile-pic").post(protect, upload.single("profilepic"), updateProfilePicture)
router.route("/update").post(protect, updatebioAndUsername)

export default router;
