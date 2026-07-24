import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorizeRole } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import PermissionController from '../controller/permission.controller.js';
import {
  createPermissionValidator,
  permissionUuidValidator,
  updatePermissionValidator,
} from '../validator/permission.validator.js';

const router = Router();
const controller = new PermissionController();
router.use(authenticate);
router.use(authorizeRole('ADMIN'));
router.get('/', asyncHandler(controller.getAll.bind(controller)));
router.post(
  '/',
  createPermissionValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  updatePermissionValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  permissionUuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
