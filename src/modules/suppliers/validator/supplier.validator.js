import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

const optionalText = (name, maxLength) =>
  body(name)
    .optional({ nullable: true })
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() || null : value))
    .isLength({ max: maxLength });
const fields = () => [
  optionalText('contactName', 150),
  body('email').optional({ nullable: true }).trim().isEmail().isLength({ max: 254 }),
  optionalText('phone', 50),
  optionalText('notes', 10000),
];
export const listValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  ...paginationValidator,
];
export const uuidValidator = [param('uuid').isUUID()];
export const createValidator = [body('name').trim().notEmpty().isLength({ max: 150 }), ...fields()];
export const updateValidator = [
  param('uuid').isUUID(),
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  ...fields(),
  body('active').optional().isBoolean().toBoolean(),
];
