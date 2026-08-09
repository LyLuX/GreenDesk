import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from '../../../core/middlewares/rate-limit.middleware.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import AuthController from '../controller/auth.controller.js';
import { requirePublicRegistration } from '../middlewares/public-registration.middleware.js';
import { loginValidator, registerValidator } from '../validator/auth.validator.js';

const router = Router();
const controller = new AuthController();
router.post(
  '/register',
  requirePublicRegistration,
  registerRateLimiter,
  registerValidator,
  validateRequest,
  asyncHandler(controller.register.bind(controller)),
);
router.post(
  '/login',
  loginRateLimiter,
  loginValidator,
  validateRequest,
  asyncHandler(controller.login.bind(controller)),
);
router.post(
  '/refresh',
  authenticate,
  refreshRateLimiter,
  asyncHandler(controller.refresh.bind(controller)),
);
router.post('/logout', authenticate, asyncHandler(controller.logout.bind(controller)));
export default router;
