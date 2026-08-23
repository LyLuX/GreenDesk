import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import fleetPermissions from '../../../core/constants/fleet-permissions.js';
import {
  authorize,
  authorizeBodyFields,
} from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import CategoryController from '../controller/category.controller.js';
import * as validator from '../validator/category.validator.js';
const router = Router();
const controller = new CategoryController();
router.use(authenticate);
router.get(
  '/',
  authorize(fleetPermissions.categories.read),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.get(
  '/:uuid',
  authorize(fleetPermissions.categories.read),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.post(
  '/',
  authorize(fleetPermissions.categories.create),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize(fleetPermissions.categories.update, fleetPermissions.categories.status.update),
  authorizeBodyFields(fleetPermissions.categories.update, {
    active: fleetPermissions.categories.status.update,
  }),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize(fleetPermissions.categories.delete),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
