import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

export const listPermissionValidator = [
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  ...paginationValidator,
];
export const permissionUuidValidator = [param('uuid').custom(isScalarInput).bail().isUUID()];
export const createPermissionValidator = [
  body('name').isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).isString().bail().trim().isLength({ max: 500 }),
];
export const updatePermissionValidator = [
  param('uuid').custom(isScalarInput).bail().isUUID(),
  body('name').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).isString().bail().trim().isLength({ max: 500 }),
];
