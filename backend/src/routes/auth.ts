import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, logout, refreshToken, forgotPassword } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
];

// Routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);

export default router;
