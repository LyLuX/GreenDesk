import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

const optionalText = (name, maxLength) =>
  body(name)
    .optional({ nullable: true })
    .isString()
    .bail()
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() || null : value))
    .isLength({ max: maxLength });
const fields = () => [
  optionalText('contactName', 150),
  body('email')
    .optional({ nullable: true })
    .isString()
    .bail()
    .trim()
    .custom(isScalarInput)
    .bail()
    .isEmail()
    .isLength({ max: 254 }),
  optionalText('phone', 50),
  optionalText('notes', 10000),
];
export const listValidator = [
  activeFilterValidator(),
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  ...paginationValidator,
];
export const uuidValidator = [param('uuid').custom(isScalarInput).bail().isUUID()];
export const createValidator = [
  body('name').isString().bail().trim().notEmpty().isLength({ max: 150 }),
  ...fields(),
];
export const updateValidator = [
  param('uuid').custom(isScalarInput).bail().isUUID(),
  body('name').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  ...fields(),
  body('active').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
];
