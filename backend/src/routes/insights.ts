import { Router } from 'express';
import {
  getInsights,
  getInsightsByDevice,
  getLatestInsight,
  createInsight,
  getReports,
  getAITips
} from '../controllers/insightsController';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// All insight routes require authentication
router.use(authenticateToken);

// Apply rate limiting
router.use(apiLimiter);

// Routes
router.get('/', getInsights);
router.get('/latest', getLatestInsight);
router.get('/device/:id', getInsightsByDevice);
router.get('/reports', getReports);
router.post('/', createInsight);
router.post('/ai-tips/:id', getAITips);

export default router;
