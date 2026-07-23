import { body, param, query } from 'express-validator';
const uuid = param('uuid').isUUID();
export const listValidator = [query('search').optional().trim().isLength({ max: 150 })];
export const uuidValidator = [uuid];
export const createValidator = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('description').optional().trim(),
];
export const updateValidator = [
  uuid,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional().trim(),
];
export const statusValidator = [uuid, body('active').isBoolean().toBoolean()];
