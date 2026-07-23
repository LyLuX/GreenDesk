import { body, param, query } from 'express-validator';
const uuid = param('uuid').isUUID();
const types = ['text', 'number', 'boolean', 'select'];
export const listValidator = [query('search').optional().trim().isLength({ max: 150 })];
export const uuidValidator = [uuid];
export const createValidator = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('type').isIn(types),
  body('unit').optional().trim().isLength({ max: 50 }),
  body('required').optional().isBoolean().toBoolean(),
];
export const updateValidator = [
  uuid,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('type').optional().isIn(types),
  body('unit').optional().trim().isLength({ max: 50 }),
  body('required').optional().isBoolean().toBoolean(),
];
export const statusValidator = [uuid, body('active').isBoolean().toBoolean()];
