import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';
import { MAX_UNIT_PRICE } from '../../../core/utils/money.js';
import { STOCK_FILTER_VALUES, STOCK_STATUS_VALUES } from '../../../core/inventory/stock-status.js';
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

const uuid = param('uuid').custom(isScalarInput).bail().isUUID();
const normalizeDecimalSeparator = (value) =>
  typeof value === 'string' ? value.replace(',', '.') : value;
const quantity = (path, { optional = false, allowZero = false, max = MAX_STOCK_QUANTITY } = {}) => {
  let validator = body(path);
  if (optional) validator = validator.optional();
  return validator
    .customSanitizer(normalizeDecimalSeparator)
    .custom(isScalarInput)
    .bail()
    .isFloat({ min: allowZero ? 0 : 0.01, max })
    .custom((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value)))
    .withMessage('La quantité doit comporter au maximum deux décimales.')
    .toFloat();
};
const intervals = [
  body('intervalDays')
    .optional({ nullable: true })
    .custom(isScalarInput)
    .bail()
    .isInt({ min: 0 })
    .toInt(),
];
const fields = [
  body('operationUuid').optional().custom(isScalarInput).bail().isUUID(),
  body('title').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 10000 }),
  body('maintenanceType').optional().custom(isScalarInput).bail().isIn(MAINTENANCE_TYPES),
  body('priority').optional().custom(isScalarInput).bail().isIn(MAINTENANCE_PRIORITIES),
  ...intervals,
  body('lastMaintenanceDate').optional({ nullable: true }).custom(isScalarInput).bail().isISO8601(),
  body('notes').optional({ nullable: true }).isString().bail().trim().isLength({ max: 10000 }),
  body('parts').optional().isArray({ max: 50 }).bail({ level: 'request' }),
  body('parts.*.partUuid').custom(isScalarInput).bail().isUUID(),
  quantity('parts.*.quantity', { max: 100000 }),
];
export const listValidator = [
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  query('materialUuid').optional({ values: 'falsy' }).custom(isScalarInput).bail().isUUID(),
  query('priority')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isIn(MAINTENANCE_PRIORITIES),
  query('maintenanceType')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isIn(MAINTENANCE_TYPES),
  query('status')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isIn(MAINTENANCE_DEADLINE_STATUSES),
  activeFilterValidator(),
  query('overdue')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isBoolean()
    .toBoolean(),
  query('upcoming')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isBoolean()
    .toBoolean(),
  ...paginationValidator,
];
export const createValidator = [
  body('materialUuid').custom(isScalarInput).bail().isUUID(),
  body().custom((value) => {
    if (value.operationUuid || (value.title && value.maintenanceType)) return true;
    throw new Error('Une opération de maintenance doit être sélectionnée.');
  }),
  ...fields,
];
export const updateValidator = [uuid, ...fields];
export const uuidValidator = [uuid];
export const historyValidator = [uuid, ...paginationValidator];
export const materialHistoryValidator = [
  query('materialUuid').custom(isScalarInput).bail().isUUID(),
  ...paginationValidator,
];
export const interventionListValidator = [
  query('materialUuid').optional({ values: 'falsy' }).custom(isScalarInput).bail().isUUID(),
  ...paginationValidator,
];
export const createInterventionValidator = [
  body('materialUuid').custom(isScalarInput).bail().isUUID(),
  body('description').isString().bail().trim().notEmpty().isLength({ max: 2000 }),
  body('performedAt')
    .optional()
    .custom(isScalarInput)
    .bail()
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  body('parts').isArray({ min: 1, max: 50 }).bail({ level: 'request' }),
  body('parts.*.partUuid').custom(isScalarInput).bail().isUUID(),
  quantity('parts.*.quantity'),
];
export const statusValidator = [
  uuid,
  body('active').custom(isScalarInput).bail().isBoolean().toBoolean(),
];
export const executeValidator = [
  uuid,
  body('performedAt').optional().custom(isScalarInput).bail().isISO8601(),
  body('comment').optional({ nullable: true }).isString().bail().trim().isLength({ max: 10000 }),
  body('partsAction')
    .optional()
    .custom(isScalarInput)
    .bail()
    .isIn(Object.values(MAINTENANCE_PART_ACTIONS)),
  body('partUuids').optional().isArray({ min: 1, max: 50 }).bail({ level: 'request' }),
  body('partUuids.*').optional().custom(isScalarInput).bail().isUUID(),
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
  query('status')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isIn(MAINTENANCE_DEADLINE_STATUSES),
  query('includeOverdue').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
  query('includeWearBased').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
];
export const maintenanceSheetListValidator = [
  ...deadlineStatusValidator,
  query('horizonDays').optional().custom(isScalarInput).bail().isInt({ min: 0, max: 365 }).toInt(),
];
export const orderListValidator = [
  ...deadlineStatusValidator,
  query('horizonDays').optional().custom(isScalarInput).bail().isInt({ min: 0, max: 365 }).toInt(),
  query('includeLowStock').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
  query('lowStockOnly').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
];
export const catalogListValidator = [
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  activeFilterValidator(),
  ...paginationValidator,
];
export const partCatalogListValidator = [
  ...catalogListValidator,
  query('partUuid').optional().custom(isScalarInput).bail().isUUID(),
  query('stockStatus')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isIn(STOCK_FILTER_VALUES),
];
const optionalText = (name, maxLength) =>
  body(name)
    .optional({ nullable: true })
    .isString()
    .bail()
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() || null : value))
    .isLength({ max: maxLength });
const unitPriceValidator = ({ optional = false } = {}) => {
  let validator = body('unitPrice');
  validator = optional ? validator.optional() : validator.exists();
  return validator
    .custom(isScalarInput)
    .bail()
    .isFloat({ min: 0, max: MAX_UNIT_PRICE })
    .custom((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value)))
    .withMessage('Le prix unitaire doit comporter au maximum deux décimales.')
    .toFloat();
};
export const createOperationValidator = [
  body('name').isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 10000 }),
  body('maintenanceType').custom(isScalarInput).bail().isIn(MAINTENANCE_TYPES),
];
export const updateOperationValidator = [
  uuid,
  body('name').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 10000 }),
  body('maintenanceType').optional().custom(isScalarInput).bail().isIn(MAINTENANCE_TYPES),
  body('active').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
];
const partUnitValidator = () =>
  body('unit')
    .optional()
    .isString()
    .bail()
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .custom((value) => !/^[+\-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+\-]?\d+)?$/.test(value))
    .withMessage('Indiquez une unité, par exemple : pièce, litre, mètre.');

export const createPartValidator = [
  body('name').isString().bail().trim().notEmpty().isLength({ max: 150 }),
  optionalText('manufacturer', 150),
  body('manufacturerUuid').optional({ nullable: true }).custom(isScalarInput).bail().isUUID(),
  body('supplierUuid').optional({ nullable: true }).custom(isScalarInput).bail().isUUID(),
  body('reference').isString().bail().trim().notEmpty().isLength({ max: 150 }),
  optionalText('supplierReference', 150),
  partUnitValidator(),
  unitPriceValidator({ optional: true }),
];
export const updatePartValidator = [
  uuid,
  body('name').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  optionalText('manufacturer', 150),
  body('manufacturerUuid').optional({ nullable: true }).custom(isScalarInput).bail().isUUID(),
  body('supplierUuid').optional({ nullable: true }).custom(isScalarInput).bail().isUUID(),
  body('reference').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  optionalText('supplierReference', 150),
  partUnitValidator(),
  body('active').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
];
export const updatePartStockValidator = [
  uuid,
  body('performedAt')
    .optional()
    .custom(isScalarInput)
    .bail()
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  body('operation').optional().custom(isScalarInput).bail().isIn(PUBLIC_STOCK_OPERATION_VALUES),
  quantity('quantity', { optional: true }),
  quantity('quantityOnHand', { optional: true, allowZero: true }),
  quantity('quantityOnOrder', { optional: true, allowZero: true }),
  body('stockStatus').optional().custom(isScalarInput).bail().isIn(STOCK_STATUS_VALUES),
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
    .custom(isScalarInput)
    .bail()
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/),
];
export const updatePartMinimumStockValidator = [
  uuid,
  quantity('minimumStockQuantity', { allowZero: true }),
];
export const priceHistoryListValidator = [uuid, ...paginationValidator];
