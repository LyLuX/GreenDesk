import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

export const listPermissionValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  ...paginationValidator,
];
export const permissionUuidValidator = [param('uuid').isUUID()];
export const createPermissionValidator = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];
export const updatePermissionValidator = [
  param('uuid').isUUID(),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];
