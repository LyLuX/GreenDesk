import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';
const uuid = param('uuid').custom(isScalarInput).bail().isUUID();
export const listValidator = [
  activeFilterValidator(),
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  ...paginationValidator,
];
export const uuidValidator = [uuid];
export const createValidator = [
  body('name').isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 10000 }),
];
export const updateValidator = [
  uuid,
  body('name').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 10000 }),
  body('active').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
];
