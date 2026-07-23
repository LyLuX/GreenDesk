import { body, param } from 'express-validator';

export const roleUuidValidator = [param('uuid').isUUID()];
export const createRoleValidator = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];
export const updateRoleValidator = [
  param('uuid').isUUID(),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];
