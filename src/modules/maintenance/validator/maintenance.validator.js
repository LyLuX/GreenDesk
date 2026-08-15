import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';
import { STOCK_STATUS_VALUES } from '../../../core/inventory/stock-status.js';
import {
  MAX_STOCK_QUANTITY,
  PUBLIC_STOCK_OPERATION_VALUES,
  STOCK_OPERATIONS,
} from '../../../core/inventory/stock-operation.js';
import { MAINTENANCE_PRIORITIES, MAINTENANCE_TYPES } from '../maintenance.constants.js';

const uuid = param('uuid').isUUID();
const intervals = [body('intervalDays').optional({ nullable: true }).isInt({ min: 1 }).toInt()];
const fields = [
  body('operationUuid').optional().isUUID(),
  body('title').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim(),
  body('maintenanceType').optional().isIn(MAINTENANCE_TYPES),
  body('priority').optional().isIn(MAINTENANCE_PRIORITIES),
  ...intervals,
  body('lastMaintenanceDate').optional({ nullable: true }).isISO8601(),
  body('notes').optional().trim(),
  body('parts').optional().isArray({ max: 50 }),
  body('parts.*.partUuid').isUUID(),
  body('parts.*.quantity').isInt({ min: 1, max: 100000 }).toInt(),
];
export const listValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('materialUuid').optional({ values: 'falsy' }).isUUID(),
  query('priority').optional({ values: 'falsy' }).isIn(MAINTENANCE_PRIORITIES),
  query('maintenanceType').optional({ values: 'falsy' }).isIn(MAINTENANCE_TYPES),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['upToDate', 'upcoming', 'dueToday', 'overdue']),
  query('active').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('overdue').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('upcoming').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  ...paginationValidator,
];
export const createValidator = [
  body('materialUuid').isUUID(),
  body().custom((value) => {
    if (value.operationUuid || (value.title && value.maintenanceType)) return true;
    throw new Error('Une opération de maintenance doit être sélectionnée.');
  }),
  ...fields,
];
export const updateValidator = [uuid, ...fields];
export const uuidValidator = [uuid];
export const historyValidator = [uuid, ...paginationValidator];
export const statusValidator = [uuid, body('active').isBoolean().toBoolean()];
export const executeValidator = [
  uuid,
  body('performedAt').optional().isISO8601(),
  body('comment').optional().trim(),
];
export const orderListValidator = [
  query('status')
    .optional({ values: 'falsy' })
    .isIn(['upToDate', 'upcoming', 'dueToday', 'overdue']),
  query('horizonDays').optional().isInt({ min: 0, max: 365 }).toInt(),
  query('includeOverdue').optional().isBoolean().toBoolean(),
];
export const catalogListValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('active').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  ...paginationValidator,
];
const optionalText = (name, maxLength) =>
  body(name)
    .optional({ nullable: true })
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() || null : value))
    .isLength({ max: maxLength });
export const createOperationValidator = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim(),
  body('maintenanceType').isIn(MAINTENANCE_TYPES),
];
export const updateOperationValidator = [
  uuid,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim(),
  body('maintenanceType').optional().isIn(MAINTENANCE_TYPES),
  body('active').optional().isBoolean().toBoolean(),
];
export const createPartValidator = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  optionalText('manufacturer', 150),
  body('manufacturerUuid').optional({ nullable: true }).isUUID(),
  body('supplierUuid').optional({ nullable: true }).isUUID(),
  body('reference').trim().notEmpty().isLength({ max: 150 }),
  optionalText('supplierReference', 150),
  body('unit').optional().trim().notEmpty().isLength({ max: 50 }),
];
export const updatePartValidator = [
  uuid,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  optionalText('manufacturer', 150),
  body('manufacturerUuid').optional({ nullable: true }).isUUID(),
  body('supplierUuid').optional({ nullable: true }).isUUID(),
  body('reference').optional().trim().notEmpty().isLength({ max: 150 }),
  optionalText('supplierReference', 150),
  body('unit').optional().trim().notEmpty().isLength({ max: 50 }),
  body('active').optional().isBoolean().toBoolean(),
];
export const updatePartStockValidator = [
  uuid,
  body('operation').optional().isIn(PUBLIC_STOCK_OPERATION_VALUES),
  body('quantity').optional().isInt({ min: 1, max: MAX_STOCK_QUANTITY }).toInt(),
  body('quantityOnHand').optional().isInt({ min: 0, max: MAX_STOCK_QUANTITY }).toInt(),
  body('quantityOnOrder').optional().isInt({ min: 0, max: MAX_STOCK_QUANTITY }).toInt(),
  body('stockStatus').optional().isIn(STOCK_STATUS_VALUES),
  body('stockQuantity').optional().isInt({ min: 0, max: MAX_STOCK_QUANTITY }).toInt(),
  body().custom((value) => {
    if (!value.operation) {
      if (value.stockStatus && Number.isInteger(value.stockQuantity)) return true;
      throw new Error('Une opération de stock doit être renseignée.');
    }
    if (value.operation === STOCK_OPERATIONS.ADJUST) {
      if (value.quantityOnHand !== undefined || value.quantityOnOrder !== undefined) return true;
      throw new Error('Une quantité à ajuster doit être renseignée.');
    }
    if (Number.isInteger(value.quantity)) return true;
    throw new Error('Une quantité positive doit être renseignée.');
  }),
];
export const stockMovementListValidator = [uuid, ...paginationValidator];
