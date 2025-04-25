import express from 'express';
import { signup, login, refreshToken, logout } from '../controllers/authController';
import { signupValidation, loginValidation } from '../middleware/validators';

const router = express.Router();

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router; 