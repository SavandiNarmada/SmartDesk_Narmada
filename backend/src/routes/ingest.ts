import { Router } from 'express';
import { body } from 'express-validator';
import { ingestSensorData, getDeviceKey, regenerateDeviceKey } from '../controllers/ingestController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiter';

const router = Router();

const ingestValidation = [
  body('ldr_do').optional().isNumeric().withMessage('ldr_do must be a number'),
  body('mic').optional().isNumeric().withMessage('mic must be a number'),
  body('mq135').optional().isNumeric().withMessage('mq135 must be a number'),
];

// Public ingest endpoint — no JWT required, authenticated by device_id or device_key
router.post('/', apiLimiter, ingestValidation, validate, ingestSensorData);

// Protected endpoints for managing device keys (require user authentication)
router.get('/key/:id', apiLimiter, authenticateToken, getDeviceKey);
router.post('/key/:id/regenerate', strictLimiter, authenticateToken, regenerateDeviceKey);

export default router;
