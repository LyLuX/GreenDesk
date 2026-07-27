import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import MaintenanceCatalogController from '../controller/maintenance-catalog.controller.js';
import MaintenanceController from '../controller/maintenance.controller.js';
import * as validator from '../validator/maintenance.validator.js';

const router = Router();
const controller = new MaintenanceController();
const catalogController = new MaintenanceCatalogController();
router.use(authenticate);
router.get(
  '/operations',
  authorize('maintenance.read'),
  asyncHandler(catalogController.operations.bind(catalogController)),
);
router.post(
  '/operations',
  authorize('maintenance.create'),
  validator.createOperationValidator,
  validateRequest,
  asyncHandler(catalogController.createOperation.bind(catalogController)),
);
router.put(
  '/operations/:uuid',
  authorize('maintenance.update'),
  validator.updateOperationValidator,
  validateRequest,
  asyncHandler(catalogController.updateOperation.bind(catalogController)),
);
router.delete(
  '/operations/:uuid',
  authorize('maintenance.delete'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(catalogController.removeOperation.bind(catalogController)),
);
router.get(
  '/parts',
  authorize('maintenance.read'),
  asyncHandler(catalogController.parts.bind(catalogController)),
);
router.post(
  '/parts',
  authorize('maintenance.create'),
  validator.createPartValidator,
  validateRequest,
  asyncHandler(catalogController.createPart.bind(catalogController)),
);
router.put(
  '/parts/:uuid',
  authorize('maintenance.update'),
  validator.updatePartValidator,
  validateRequest,
  asyncHandler(catalogController.updatePart.bind(catalogController)),
);
router.delete(
  '/parts/:uuid',
  authorize('maintenance.delete'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(catalogController.removePart.bind(catalogController)),
);
router.get(
  '/order-list',
  authorize('maintenance.read'),
  validator.orderListValidator,
  validateRequest,
  asyncHandler(controller.orderList.bind(controller)),
);
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
  authorize('maintenance.update'),
  validator.statusValidator,
  validateRequest,
  asyncHandler(controller.status.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize('maintenance.delete'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
