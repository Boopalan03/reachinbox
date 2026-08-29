import { Router } from 'express';
import { connect, callback, disconnect, status } from '../controllers/slackController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Connect requires auth (we need the userId to store the token against)
router.get('/connect', authMiddleware, connect);

// Callback does NOT require auth — Slack redirects here directly
router.get('/callback', callback);

// Disconnect and status require auth
router.delete('/disconnect', authMiddleware, disconnect);
router.get('/status', authMiddleware, status);

export default router;
