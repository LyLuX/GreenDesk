import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';
export const listValidator = [
  activeFilterValidator(),
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  ...paginationValidator,
];
export const uuidValidator = [param('uuid').custom(isScalarInput).bail().isUUID()];
export const createValidator = [
  body('name').isString().bail().trim().notEmpty().isLength({ max: 150 }),
];
export const updateValidator = [
  param('uuid').custom(isScalarInput).bail().isUUID(),
  body('name').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('active').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
];
