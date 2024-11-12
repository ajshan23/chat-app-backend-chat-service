// userRoutes.ts
import { Router } from 'express';
import { loginUser, registerUser, verifyOtp } from '../controllers/authController'; // Adjust the path according to your project structure

const router = Router();

router.route('/register').post(registerUser);
router.route('/verify').post(verifyOtp);
router.route('/login').post(loginUser);
export default router;
