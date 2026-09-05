import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';
import { MAX_UNIT_PRICE } from '../../../core/utils/money.js';
import { STOCK_STATUS_VALUES } from '../../../core/inventory/stock-status.js';
import {
  MAX_STOCK_QUANTITY,
  PUBLIC_STOCK_OPERATION_VALUES,
  STOCK_OPERATIONS,
} from '../../../core/inventory/stock-operation.js';
import {
  MAINTENANCE_DEADLINE_STATUSES,
  MAINTENANCE_PART_ACTIONS,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_TYPES,
} from '../maintenance.constants.js';

const uuid = param('uuid').isUUID();
const normalizeDecimalSeparator = (value) =>
  typeof value === 'string' ? value.replace(',', '.') : value;
const quantity = (path, { optional = false, allowZero = false, max = MAX_STOCK_QUANTITY } = {}) => {
  let validator = body(path);
  if (optional) validator = validator.optional();
  return validator
    .customSanitizer(normalizeDecimalSeparator)
    .isFloat({ min: allowZero ? 0 : 0.01, max })
    .custom((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value)))
    .withMessage('La quantité doit comporter au maximum deux décimales.')
    .toFloat();
};
const intervals = [body('intervalDays').optional({ nullable: true }).isInt({ min: 0 }).toInt()];
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
  quantity('parts.*.quantity', { max: 100000 }),
];
export const listValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('materialUuid').optional({ values: 'falsy' }).isUUID(),
  query('priority').optional({ values: 'falsy' }).isIn(MAINTENANCE_PRIORITIES),
  query('maintenanceType').optional({ values: 'falsy' }).isIn(MAINTENANCE_TYPES),
  query('status').optional({ values: 'falsy' }).isIn(MAINTENANCE_DEADLINE_STATUSES),
  activeFilterValidator(),
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
export const interventionListValidator = [
  query('materialUuid').optional({ values: 'falsy' }).isUUID(),
  ...paginationValidator,
];
export const createInterventionValidator = [
  body('materialUuid').isUUID(),
  body('description').trim().notEmpty().isLength({ max: 2000 }),
  body('performedAt')
    .optional()
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  body('parts').isArray({ min: 1, max: 50 }),
  body('parts.*.partUuid').isUUID(),
  quantity('parts.*.quantity'),
];
export const statusValidator = [uuid, body('active').isBoolean().toBoolean()];
export const executeValidator = [
  uuid,
  body('performedAt').optional().isISO8601(),
  body('comment').optional().trim(),
  body('partsAction').optional().isIn(Object.values(MAINTENANCE_PART_ACTIONS)),
  body('partUuids').optional().isArray({ min: 1, max: 50 }),
  body('partUuids.*').optional().isUUID(),
  body().custom((value) => {
    const skipsPlannedParts = [
      MAINTENANCE_PART_ACTIONS.PARTIAL,
      MAINTENANCE_PART_ACTIONS.SKIP,
    ].includes(value.partsAction);
    if (skipsPlannedParts && !value.comment) {
      throw new Error('Un commentaire est obligatoire lorsque des pièces ne sont pas remplacées.');
    }
    if (value.partsAction === MAINTENANCE_PART_ACTIONS.PARTIAL && !value.partUuids?.length) {
      throw new Error('Au moins une pièce remplacée doit être sélectionnée.');
    }
    if (value.partsAction !== MAINTENANCE_PART_ACTIONS.PARTIAL && value.partUuids !== undefined) {
      throw new Error('La sélection de pièces est réservée au remplacement partiel.');
    }
    return true;
  }),
];
const deadlineStatusValidator = [
  query('status').optional({ values: 'falsy' }).isIn(MAINTENANCE_DEADLINE_STATUSES),
  query('includeOverdue').optional().isBoolean().toBoolean(),
  query('includeWearBased').optional().isBoolean().toBoolean(),
];
export const maintenanceSheetListValidator = [...deadlineStatusValidator];
export const orderListValidator = [
  ...deadlineStatusValidator,
  query('horizonDays').optional().isInt({ min: 0, max: 365 }).toInt(),
  query('includeLowStock').optional().isBoolean().toBoolean(),
  query('lowStockOnly').optional().isBoolean().toBoolean(),
];
export const catalogListValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  activeFilterValidator(),
  ...paginationValidator,
];
export const partCatalogListValidator = [
  ...catalogListValidator,
  query('stockStatus').optional({ values: 'falsy' }).isIn(STOCK_STATUS_VALUES),
];
const optionalText = (name, maxLength) =>
  body(name)
    .optional({ nullable: true })
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() || null : value))
    .isLength({ max: maxLength });
const unitPriceValidator = ({ optional = false } = {}) => {
  let validator = body('unitPrice');
  validator = optional ? validator.optional() : validator.exists();
  return validator
    .isFloat({ min: 0, max: MAX_UNIT_PRICE })
    .custom((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value)))
    .withMessage('Le prix unitaire doit comporter au maximum deux décimales.')
    .toFloat();
};
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
  unitPriceValidator({ optional: true }),
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
  body('performedAt')
    .optional()
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  body('operation').optional().isIn(PUBLIC_STOCK_OPERATION_VALUES),
  quantity('quantity', { optional: true }),
  quantity('quantityOnHand', { optional: true, allowZero: true }),
  quantity('quantityOnOrder', { optional: true, allowZero: true }),
  body('stockStatus').optional().isIn(STOCK_STATUS_VALUES),
  quantity('stockQuantity', { optional: true, allowZero: true }),
  body().custom((value) => {
    if (!value.operation) {
      if (value.stockStatus && Number.isFinite(value.stockQuantity)) return true;
      throw new Error('Une opération de stock doit être renseignée.');
    }
    if (value.operation === STOCK_OPERATIONS.ADJUST) {
      if (value.quantityOnHand !== undefined || value.quantityOnOrder !== undefined) return true;
      throw new Error('Une quantité à ajuster doit être renseignée.');
    }
    if (Number.isFinite(value.quantity)) return true;
    throw new Error('Une quantité positive doit être renseignée.');
  }),
];
export const stockMovementListValidator = [uuid, ...paginationValidator];
export const updatePartPriceValidator = [
  uuid,
  unitPriceValidator(),
  body('performedAt')
    .optional()
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
];
export const updatePartMinimumStockValidator = [
  uuid,
  quantity('minimumStockQuantity', { allowZero: true }),
];
export const priceHistoryListValidator = [uuid, ...paginationValidator];
