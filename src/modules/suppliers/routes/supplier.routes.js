import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import SupplierController from '../controller/supplier.controller.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';
import * as validator from '../validator/supplier.validator.js';

const router = Router();
const controller = new SupplierController();
router.use(authenticate);
router.get(
  '/',
  authorize('suppliers.read', maintenancePermissions.parts.read),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.post(
  '/',
  authorize('suppliers.create'),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize('suppliers.update'),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize('suppliers.delete'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);

export default router;
