import { body, param, query } from 'express-validator';
import { MAINTENANCE_PRIORITIES, MAINTENANCE_TYPES } from '../maintenance.constants.js';

const uuid = param('uuid').isUUID();
const listLimit = query('limit')
  .optional()
  .custom(
    (value) =>
      value === 'all' ||
      (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100),
  )
  .customSanitizer((value) => (value === 'all' ? value : Number(value)));
const intervals = [
  body('intervalDays').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('intervalHours').optional({ nullable: true }).isFloat({ gt: 0 }).toFloat(),
];
const fields = [
  body('title').trim().notEmpty().isLength({ max: 150 }),
  body('maintenanceType').isIn(MAINTENANCE_TYPES),
  body('priority').optional().isIn(MAINTENANCE_PRIORITIES),
  ...intervals,
  body('lastMaintenanceDate').optional({ nullable: true }).isISO8601(),
  body('lastEngineHours').optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
  body('notes').optional().trim(),
];
export const listValidator = [
  query('materialUuid').optional({ values: 'falsy' }).isUUID(),
  query('priority').optional({ values: 'falsy' }).isIn(MAINTENANCE_PRIORITIES),
  query('maintenanceType').optional({ values: 'falsy' }).isIn(MAINTENANCE_TYPES),
  query('status').optional({ values: 'falsy' }).isIn(['upToDate', 'upcoming', 'overdue']),
  query('active').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('overdue').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('upcoming').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  listLimit,
];
export const createValidator = [body('materialUuid').isUUID(), ...fields];
export const updateValidator = [
  uuid,
  body('title').optional().trim().notEmpty().isLength({ max: 150 }),
  body('maintenanceType').optional().isIn(MAINTENANCE_TYPES),
  body('priority').optional().isIn(MAINTENANCE_PRIORITIES),
  ...intervals,
  body('lastMaintenanceDate').optional({ nullable: true }).isISO8601(),
  body('lastEngineHours').optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
  body('notes').optional().trim(),
];
export const uuidValidator = [uuid];
export const statusValidator = [uuid, body('active').isBoolean().toBoolean()];
export const executeValidator = [
  uuid,
  body('performedAt').optional().isISO8601(),
  body('engineHours').optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
  body('comment').optional().trim(),
];
