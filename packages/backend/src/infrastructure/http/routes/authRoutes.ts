import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.put('/profile', requireAuth, AuthController.updateProfile);
router.put('/onboarding', requireAuth, AuthController.completeOnboarding);

router.get('/public/:username', AuthController.getPublicProfile);

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/verify-otp', authRateLimiter, AuthController.verifyOtp);
router.post('/resend-otp', authRateLimiter, AuthController.resendOtp);
router.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
router.post('/verify-reset-otp', authRateLimiter, AuthController.verifyResetOtp);
router.post('/reset-password', authRateLimiter, AuthController.resetPassword);

// 2FA routes
router.post('/2fa/setup', requireAuth, AuthController.setup2FA);
router.post('/2fa/verify', requireAuth, AuthController.verify2FA);
router.post('/2fa/validate', AuthController.validate2FA);
router.post('/2fa/disable', requireAuth, AuthController.disable2FA);

// Session management routes
router.get('/sessions', requireAuth, AuthController.getSessions);
router.delete('/sessions/:id', requireAuth, AuthController.deleteSession);
router.post('/sessions/logout-others', requireAuth, AuthController.logoutOtherDevices);

// GDPR / Privacy routes
router.get('/export-data', requireAuth, AuthController.exportData);
router.delete('/account', requireAuth, AuthController.deleteAccount);
router.post('/account/cancel-deletion', requireAuth, AuthController.cancelDeletion);

export default router;

