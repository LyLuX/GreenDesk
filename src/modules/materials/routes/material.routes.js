import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import MaterialController from '../controller/material.controller.js';
import * as validator from '../validator/material.validator.js';
const router = Router();
const controller = new MaterialController();
router.use(authenticate);
router.get(
  '/',
  authorize('materials.read'),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.get(
  '/:uuid/history',
  authorize('materials.read'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.history.bind(controller)),
);
router.get(
  '/:uuid',
  authorize('materials.read'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.post(
  '/',
  authorize('materials.create'),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize('materials.update'),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.patch(
  '/:uuid/status',
  authorize('materials.disable'),
  validator.statusValidator,
  validateRequest,
  asyncHandler(controller.status.bind(controller)),
);
export default router;
