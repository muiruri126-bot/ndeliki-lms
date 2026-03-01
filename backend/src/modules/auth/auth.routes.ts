import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate, validate } from '../../middleware';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas';

const router = Router();

router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword.bind(authController));
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword.bind(authController));
router.get('/profile', authenticate, authController.getProfile.bind(authController));

export default router;
