import { body, param } from 'express-validator';

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
