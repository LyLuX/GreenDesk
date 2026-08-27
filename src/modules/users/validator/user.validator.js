import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

const uuid = param('uuid').isUUID().withMessage('uuid must be valid');
export const listUserValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('active').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('deleted').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('includeDeleted').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('roleUuid').optional({ values: 'falsy' }).isUUID(),
  ...paginationValidator,
];
export const createUserValidator = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('roleUuids').optional().isArray(),
  body('roleUuids.*').optional().isUUID(),
  body('companyUuids').optional().isArray(),
  body('companyUuids.*').optional().isUUID(),
];
export const updateUserValidator = [
  uuid,
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 8 }),
  body('isActive').optional().isBoolean().toBoolean(),
  body('roleUuids').optional().isArray(),
  body('roleUuids.*').optional().isUUID(),
  body('companyUuids').optional().isArray(),
  body('companyUuids.*').optional().isUUID(),
];
export const userUuidValidator = [uuid];
