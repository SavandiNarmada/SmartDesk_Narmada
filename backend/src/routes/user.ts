import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
  registerPushToken,
  removePushToken
} from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Apply rate limiting
router.use(apiLimiter);

// Routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Push notification tokens
router.post('/push-token', registerPushToken);
router.delete('/push-token', removePushToken);

export default router;
