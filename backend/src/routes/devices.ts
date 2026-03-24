import { Router } from 'express';
import { body } from 'express-validator';
import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceReadings,
  createDeviceReading
} from '../controllers/devicesController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiter';

const router = Router();

// All device routes require authentication
router.use(authenticateToken);

// Apply general rate limiting
router.use(apiLimiter);

const createDeviceValidation = [
  body('name').notEmpty().withMessage('Device name is required'),
  body('type').isIn(['air_quality', 'light_sensor', 'noise_meter', 'multi_sensor'])
    .withMessage('Invalid device type'),
  body('location').notEmpty().withMessage('Location is required'),
];

// Routes
router.get('/', getDevices);
router.post('/', strictLimiter, createDeviceValidation, validate, createDevice);
router.put('/:id', updateDevice);
router.delete('/:id', strictLimiter, deleteDevice);
router.get('/:id/readings', getDeviceReadings);
router.post('/:id/readings', createDeviceReading);

export default router;
