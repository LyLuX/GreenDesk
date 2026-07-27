import { body, param, query } from 'express-validator';
import { MAINTENANCE_PRIORITIES, MAINTENANCE_TYPES } from '../maintenance.constants.js';

const uuid = param('uuid').isUUID();
const optionalText = (name, max) =>
  body(name).optional({ nullable: true }).trim().isLength({ max });
const fields = [
  body('title').trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim(),
  body('maintenanceType').isIn(MAINTENANCE_TYPES),
  body('intervalDays').isInt({ min: 1 }).toInt(),
  body('priority').optional().isIn(MAINTENANCE_PRIORITIES),
  optionalText('partReference', 150),
  body('quantity').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('instructions').optional({ nullable: true }).trim(),
];

export const listValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('active').optional({ values: 'falsy' }).isBoolean().toBoolean(),
];
export const createValidator = [body('materialUuid').isUUID(), ...fields];
export const updateValidator = [
  uuid,
  body('materialUuid').optional().isUUID(),
  body('title').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim(),
  body('maintenanceType').optional().isIn(MAINTENANCE_TYPES),
  body('intervalDays').optional().isInt({ min: 1 }).toInt(),
  body('priority').optional().isIn(MAINTENANCE_PRIORITIES),
  optionalText('partReference', 150),
  body('quantity').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('instructions').optional({ nullable: true }).trim(),
  body('active').optional().isBoolean().toBoolean(),
];
export const uuidValidator = [uuid];
