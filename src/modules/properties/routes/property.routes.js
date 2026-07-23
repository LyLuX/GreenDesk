import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import PropertyController from '../controller/property.controller.js';
import * as validator from '../validator/property.validator.js';
const router = Router();
const controller = new PropertyController();
router.use(authenticate);
router.get(
  '/',
  authorize('properties.read'),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.get(
  '/:uuid',
  authorize('properties.read'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.post(
  '/',
  authorize('properties.create'),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize('properties.update'),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.patch(
  '/:uuid/status',
  authorize('properties.disable'),
  validator.statusValidator,
  validateRequest,
  asyncHandler(controller.status.bind(controller)),
);
export default router;
