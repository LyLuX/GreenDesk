import { body, param, query } from 'express-validator';
export const listValidator = [query('search').optional().trim().isLength({ max: 150 })];
export const uuidValidator = [param('uuid').isUUID()];
export const createValidator = [body('name').trim().notEmpty().isLength({ max: 150 })];
export const updateValidator = [
  param('uuid').isUUID(),
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
];
export const statusValidator = [param('uuid').isUUID(), body('active').isBoolean().toBoolean()];
