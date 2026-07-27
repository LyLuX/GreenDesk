import { body, param, query } from 'express-validator';
export const listValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
];
export const uuidValidator = [param('uuid').isUUID()];
export const createValidator = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim(),
  body('notes').optional({ nullable: true }).trim(),
];
export const updateValidator = [
  param('uuid').isUUID(),
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim(),
  body('notes').optional({ nullable: true }).trim(),
  body('active').optional().isBoolean().toBoolean(),
];
