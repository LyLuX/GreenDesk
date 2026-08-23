import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import administrationPermissions from '../../../core/constants/administration-permissions.js';
import {
  authorize,
  authorizeBodyFields,
} from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import RoleController from '../controller/role.controller.js';
import {
  createRoleValidator,
  listRoleValidator,
  roleUuidValidator,
  updateRoleValidator,
} from '../validator/role.validator.js';

const router = Router();
const controller = new RoleController();
router.use(authenticate);
router.get(
  '/',
  authorize(administrationPermissions.roles.read),
  listRoleValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.post(
  '/',
  authorize(administrationPermissions.roles.create),
  authorizeBodyFields(null, {
    permissionUuids: administrationPermissions.roles.permissions.update,
  }),
  createRoleValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize(
    administrationPermissions.roles.update,
    administrationPermissions.roles.permissions.update,
  ),
  authorizeBodyFields(administrationPermissions.roles.update, {
    permissionUuids: administrationPermissions.roles.permissions.update,
  }),
  updateRoleValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize(administrationPermissions.roles.delete),
  roleUuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
