import { Router } from 'express';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import AuthController from '../controller/auth.controller.js';
import { loginValidator, registerValidator } from '../validator/auth.validator.js';

const router = Router();
const controller = new AuthController();
router.post(
  '/register',
  registerValidator,
  validateRequest,
  asyncHandler(controller.register.bind(controller)),
);
router.post(
  '/login',
  loginValidator,
  validateRequest,
  asyncHandler(controller.login.bind(controller)),
);
export default router;
