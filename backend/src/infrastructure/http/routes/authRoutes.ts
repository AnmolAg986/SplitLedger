import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/verify-otp', authRateLimiter, AuthController.verifyOtp);
router.post('/resend-otp', authRateLimiter, AuthController.resendOtp);
router.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
router.post('/verify-reset-otp', authRateLimiter, AuthController.verifyResetOtp);
router.post('/reset-password', authRateLimiter, AuthController.resetPassword);

export default router;
