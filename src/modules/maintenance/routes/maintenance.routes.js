import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize, authorizeAll } from '../../../core/middlewares/authorization.middleware.js';
import { STOCK_OPERATIONS } from '../../../core/inventory/stock-operation.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import MaintenanceCatalogController from '../controller/maintenance-catalog.controller.js';
import MaintenanceController from '../controller/maintenance.controller.js';
import { MAINTENANCE_PART_ACTIONS } from '../maintenance.constants.js';
import maintenancePermissions from '../maintenance.permissions.js';
import * as validator from '../validator/maintenance.validator.js';

const router = Router();
const controller = new MaintenanceController();
const catalogController = new MaintenanceCatalogController();
const authorizeWithoutPartReplacement = authorize(
  maintenancePermissions.plans.executeWithoutPartReplacement,
);
const requireWithoutPartReplacementPermission = (request, response, next) => {
  if (request.body?.partsAction !== MAINTENANCE_PART_ACTIONS.SKIP) return next();
  return authorizeWithoutPartReplacement(request, response, next);
};
const partStockPermissions = Object.values(maintenancePermissions.parts.stock);
const authorizePartStockAction = authorize(...partStockPermissions);
const requirePartStockActionPermission = (request, response, next) => {
  const { operation } = request.body;
  if (operation === STOCK_OPERATIONS.ORDER) {
    return authorizeAll(maintenancePermissions.parts.stock.order)(request, response, next);
  }
  if (operation === STOCK_OPERATIONS.RECEIVE) {
    return authorizeAll(maintenancePermissions.parts.stock.receive)(request, response, next);
  }
  const requiredPermissions = [];
  if (!operation || Object.hasOwn(request.body, 'quantityOnHand')) {
    requiredPermissions.push(maintenancePermissions.parts.stock.adjustOnHand);
  }
  if (!operation || Object.hasOwn(request.body, 'quantityOnOrder')) {
    requiredPermissions.push(maintenancePermissions.parts.stock.adjustOnOrder);
  }
  return authorizeAll(...requiredPermissions)(request, response, next);
};
router.use(authenticate);
router.get(
  '/operations',
  authorize(maintenancePermissions.operations.read, maintenancePermissions.plans.read),
  validator.catalogListValidator,
  validateRequest,
  asyncHandler(catalogController.operations.bind(catalogController)),
);
router.post(
  '/operations',
  authorize(maintenancePermissions.operations.create),
  validator.createOperationValidator,
  validateRequest,
  asyncHandler(catalogController.createOperation.bind(catalogController)),
);
router.put(
  '/operations/:uuid',
  authorize(maintenancePermissions.operations.update),
  validator.updateOperationValidator,
  validateRequest,
  asyncHandler(catalogController.updateOperation.bind(catalogController)),
);
router.delete(
  '/operations/:uuid',
  authorize(maintenancePermissions.operations.delete),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(catalogController.removeOperation.bind(catalogController)),
);
router.get(
  '/parts',
  authorize(maintenancePermissions.parts.read, maintenancePermissions.plans.read),
  validator.partCatalogListValidator,
  validateRequest,
  asyncHandler(catalogController.parts.bind(catalogController)),
);
router.post(
  '/parts',
  authorize(maintenancePermissions.parts.create),
  validator.createPartValidator,
  validateRequest,
  asyncHandler(catalogController.createPart.bind(catalogController)),
);
router.put(
  '/parts/:uuid',
  authorize(maintenancePermissions.parts.update),
  validator.updatePartValidator,
  validateRequest,
  asyncHandler(catalogController.updatePart.bind(catalogController)),
);
router.patch(
  '/parts/:uuid/stock',
  authorizePartStockAction,
  validator.updatePartStockValidator,
  validateRequest,
  requirePartStockActionPermission,
  asyncHandler(catalogController.updatePartStock.bind(catalogController)),
);
router.patch(
  '/parts/:uuid/price',
  authorize(maintenancePermissions.parts.price.update),
  validator.updatePartPriceValidator,
  validateRequest,
  asyncHandler(catalogController.updatePartPrice.bind(catalogController)),
);
router.get(
  '/parts/:uuid/stock-movements',
  authorize(maintenancePermissions.parts.read),
  validator.stockMovementListValidator,
  validateRequest,
  asyncHandler(catalogController.partStockMovements.bind(catalogController)),
);
router.get(
  '/parts/:uuid/price-history',
  authorize(maintenancePermissions.parts.read),
  validator.priceHistoryListValidator,
  validateRequest,
  asyncHandler(catalogController.partPriceHistory.bind(catalogController)),
);
router.delete(
  '/parts/:uuid',
  authorize(maintenancePermissions.parts.delete),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(catalogController.removePart.bind(catalogController)),
);
router.get(
  '/order-list',
  authorize(maintenancePermissions.plans.read),
  validator.orderListValidator,
  validateRequest,
  asyncHandler(controller.orderList.bind(controller)),
);
router.get(
  '/',
  authorize(maintenancePermissions.plans.read),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.post(
  '/',
  authorize(maintenancePermissions.plans.create),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.post(
  '/:uuid/execute',
  authorize(maintenancePermissions.plans.execute),
  requireWithoutPartReplacementPermission,
  validator.executeValidator,
  validateRequest,
  asyncHandler(controller.execute.bind(controller)),
);
router.get(
  '/:uuid/history',
  authorize(maintenancePermissions.plans.read),
  validator.historyValidator,
  validateRequest,
  asyncHandler(controller.history.bind(controller)),
);
router.get(
  '/:uuid',
  authorize(maintenancePermissions.plans.read),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.put(
  '/:uuid',
  authorize(maintenancePermissions.plans.update),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.patch(
  '/:uuid/status',
  authorize(maintenancePermissions.plans.update),
  validator.statusValidator,
  validateRequest,
  asyncHandler(controller.status.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize(maintenancePermissions.plans.delete),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
