import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import administrationPermissions from '../../../core/constants/administration-permissions.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import PermissionController from '../controller/permission.controller.js';
import {
  createPermissionValidator,
  listPermissionValidator,
  permissionUuidValidator,
  updatePermissionValidator,
} from '../validator/permission.validator.js';

const router = Router();
const controller = new PermissionController();
router.use(authenticate);
router.get(
  '/',
  authorize(administrationPermissions.permissions.read),
  listPermissionValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.post(
  '/',
  authorize(administrationPermissions.permissions.create),
  createPermissionValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize(administrationPermissions.permissions.update),
  updatePermissionValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize(administrationPermissions.permissions.delete),
  permissionUuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
