import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';
const uuid = param('uuid').isUUID();
export const listValidator = [
  activeFilterValidator(),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  ...paginationValidator,
];
export const uuidValidator = [uuid];
export const createValidator = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('description').optional().trim(),
];
export const updateValidator = [
  uuid,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional().trim(),
  body('active').optional().isBoolean().toBoolean(),
];
