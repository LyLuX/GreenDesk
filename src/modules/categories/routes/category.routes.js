import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import CategoryController from '../controller/category.controller.js';
import * as validator from '../validator/category.validator.js';
const router = Router();
const controller = new CategoryController();
router.use(authenticate);
router.get(
  '/',
  authorize('categories.read'),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.get(
  '/:uuid',
  authorize('categories.read'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.post(
  '/',
  authorize('categories.create'),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize('categories.update'),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.patch(
  '/:uuid/status',
  authorize('categories.disable'),
  validator.statusValidator,
  validateRequest,
  asyncHandler(controller.status.bind(controller)),
);
export default router;
