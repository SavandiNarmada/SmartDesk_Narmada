import { Router } from 'express';
import {
  getThresholds,
  updateThresholds,
  resetThresholds
} from '../controllers/thresholdsController';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(apiLimiter);

router.get('/', getThresholds);
router.put('/', updateThresholds);
router.post('/reset', resetThresholds);

export default router;
