import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import UserController from '../controller/user.controller.js';
import {
  createUserValidator,
  updateUserValidator,
  userUuidValidator,
} from '../validator/user.validator.js';

const router = Router();
const controller = new UserController();
router.use(authenticate);
router.get('/', asyncHandler(controller.getAll.bind(controller)));
router.get(
  '/:uuid',
  userUuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.post(
  '/',
  createUserValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  updateUserValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  userUuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
