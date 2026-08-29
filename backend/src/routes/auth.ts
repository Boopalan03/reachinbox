import { Router } from 'express';
import { register, login, getMe, googleAuth } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authMiddleware, getMe);

export default router;
