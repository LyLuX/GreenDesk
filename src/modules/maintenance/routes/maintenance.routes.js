import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import MaintenanceController from '../controller/maintenance.controller.js';
import * as validator from '../validator/maintenance.validator.js';

const router = Router();
const controller = new MaintenanceController();
router.use(authenticate);
router.get(
  '/',
  authorize('maintenance.read'),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.post(
  '/',
  authorize('maintenance.create'),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.post(
  '/:uuid/execute',
  authorize('maintenance.execute'),
  validator.executeValidator,
  validateRequest,
  asyncHandler(controller.execute.bind(controller)),
);
router.get(
  '/:uuid/history',
  authorize('maintenance.read'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.history.bind(controller)),
);
router.get(
  '/:uuid',
  authorize('maintenance.read'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.put(
  '/:uuid',
  authorize('maintenance.update'),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.patch(
  '/:uuid/status',
  authorize('maintenance.delete'),
  validator.statusValidator,
  validateRequest,
  asyncHandler(controller.status.bind(controller)),
);
export default router;
