import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

export const listRoleValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('permissionUuid').optional({ values: 'falsy' }).isUUID(),
  ...paginationValidator,
];
export const roleUuidValidator = [param('uuid').isUUID()];
export const createRoleValidator = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('permissionUuids').optional().isArray(),
  body('permissionUuids.*').optional().isUUID(),
];
export const updateRoleValidator = [
  param('uuid').isUUID(),
  body('name')
    .not()
    .exists()
    .withMessage('Le nom d’un rôle ne peut pas être modifié après sa création.'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('permissionUuids').optional().isArray(),
  body('permissionUuids.*').optional().isUUID(),
];
