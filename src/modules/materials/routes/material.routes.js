import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { resolveCompanyContext } from '../../../core/middlewares/company-context.middleware.js';
import fleetPermissions from '../../../core/constants/fleet-permissions.js';
import {
  authorize,
  authorizeBodyFields,
} from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import MaterialController from '../controller/material.controller.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';
import * as validator from '../validator/material.validator.js';
const router = Router();
const controller = new MaterialController();
router.use(authenticate, resolveCompanyContext);
router.get(
  '/',
  authorize(fleetPermissions.materials.read),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.get(
  '/options',
  authorize(
    fleetPermissions.materials.read,
    maintenancePermissions.plans.read,
    maintenancePermissions.parts.stock.consume,
  ),
  validator.optionsValidator,
  validateRequest,
  asyncHandler(controller.getOptions.bind(controller)),
);
router.get(
  '/:uuid/history',
  authorize(fleetPermissions.materials.read),
  validator.historyValidator,
  validateRequest,
  asyncHandler(controller.history.bind(controller)),
);
router.get(
  '/:uuid',
  authorize(fleetPermissions.materials.read),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.post(
  '/',
  authorize(fleetPermissions.materials.create),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize(fleetPermissions.materials.update, fleetPermissions.materials.status.update),
  authorizeBodyFields(fleetPermissions.materials.update, {
    active: fleetPermissions.materials.status.update,
  }),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize(fleetPermissions.materials.delete),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
