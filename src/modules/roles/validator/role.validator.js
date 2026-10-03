import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

export const listRoleValidator = [
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  query('permissionUuid').optional({ values: 'falsy' }).custom(isScalarInput).bail().isUUID(),
  ...paginationValidator,
];
export const roleUuidValidator = [param('uuid').custom(isScalarInput).bail().isUUID()];
export const createRoleValidator = [
  body('name').isString().bail().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional({ nullable: true }).isString().bail().trim().isLength({ max: 500 }),
  body('permissionUuids').optional().isArray().bail({ level: 'request' }),
  body('permissionUuids.*').optional().custom(isScalarInput).bail().isUUID(),
];
export const updateRoleValidator = [
  param('uuid').custom(isScalarInput).bail().isUUID(),
  body('name')
    .not()
    .exists()
    .withMessage('Le nom d’un rôle ne peut pas être modifié après sa création.'),
  body('description').optional({ nullable: true }).isString().bail().trim().isLength({ max: 500 }),
  body('permissionUuids').optional().isArray().bail({ level: 'request' }),
  body('permissionUuids.*').optional().custom(isScalarInput).bail().isUUID(),
];
