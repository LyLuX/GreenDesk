import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import administrationPermissions from '../../../core/constants/administration-permissions.js';
import {
  authorize,
  authorizeBodyFields,
} from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import UserController from '../controller/user.controller.js';
import {
  createUserValidator,
  listUserValidator,
  updateUserValidator,
  userUuidValidator,
} from '../validator/user.validator.js';

const router = Router();
const controller = new UserController();
const authorizeDeletedUserListing = (request, response, next) => {
  if (!request.query.deleted) return next();
  return authorize(administrationPermissions.users.deleted.read)(request, response, next);
};
router.use(authenticate);
router.get(
  '/',
  authorize(administrationPermissions.users.read),
  listUserValidator,
  validateRequest,
  authorizeDeletedUserListing,
  asyncHandler(controller.getAll.bind(controller)),
);
router.get(
  '/:uuid',
  authorize(administrationPermissions.users.read),
  userUuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.post(
  '/',
  authorize(administrationPermissions.users.create),
  authorizeBodyFields(null, {
    roleUuids: administrationPermissions.users.roles.update,
  }),
  createUserValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize(
    administrationPermissions.users.update,
    administrationPermissions.users.status.update,
    administrationPermissions.users.password.update,
    administrationPermissions.users.roles.update,
  ),
  authorizeBodyFields(administrationPermissions.users.update, {
    isActive: administrationPermissions.users.status.update,
    password: administrationPermissions.users.password.update,
    roleUuids: administrationPermissions.users.roles.update,
  }),
  updateUserValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize(administrationPermissions.users.delete),
  userUuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
router.post(
  '/:uuid/restore',
  authorize(administrationPermissions.users.restore),
  userUuidValidator,
  validateRequest,
  asyncHandler(controller.restore.bind(controller)),
);
router.post(
  '/:uuid/email-verification/resend',
  authorize(administrationPermissions.users.emailVerification.resend),
  userUuidValidator,
  validateRequest,
  asyncHandler(controller.resendEmailVerification.bind(controller)),
);
export default router;
