import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';
export const listValidator = [
  activeFilterValidator(),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  ...paginationValidator,
];
export const uuidValidator = [param('uuid').isUUID()];
export const createValidator = [body('name').trim().notEmpty().isLength({ max: 150 })];
export const updateValidator = [
  param('uuid').isUUID(),
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('active').optional().isBoolean().toBoolean(),
];
