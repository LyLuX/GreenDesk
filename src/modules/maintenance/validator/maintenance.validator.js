import { body, param, query } from 'express-validator';
import { MAINTENANCE_PRIORITIES, MAINTENANCE_TYPES } from '../maintenance.constants.js';

const uuid = param('uuid').isUUID();
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
  query('materialUuid').optional().isUUID(),
  query('priority').optional().isIn(MAINTENANCE_PRIORITIES),
  query('maintenanceType').optional().isIn(MAINTENANCE_TYPES),
  query('status').optional().isIn(['upToDate', 'upcoming', 'overdue']),
  query('active').optional().isBoolean().toBoolean(),
  query('overdue').optional().isBoolean().toBoolean(),
  query('upcoming').optional().isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
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
