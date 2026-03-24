import { Router } from 'express';
import {
  saveCredentials,
  getCredentials,
  deleteCredentials,
  testConnection,
  syncNow
} from '../controllers/protonestController';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(apiLimiter);

router.post('/credentials', saveCredentials);
router.get('/credentials', getCredentials);
router.delete('/credentials', deleteCredentials);
router.post('/test', testConnection);
router.post('/sync', syncNow);

export default router;
