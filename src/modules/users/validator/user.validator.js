import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

const uuid = param('uuid').custom(isScalarInput).bail().isUUID().withMessage('uuid must be valid');
export const listUserValidator = [
  query('search').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 150 }),
  activeFilterValidator(),
  query('deleted')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isBoolean()
    .toBoolean(),
  query('includeDeleted')
    .optional({ values: 'falsy' })
    .custom(isScalarInput)
    .bail()
    .isBoolean()
    .toBoolean(),
  query('roleUuid').optional({ values: 'falsy' }).custom(isScalarInput).bail().isUUID(),
  ...paginationValidator,
];
export const createUserValidator = [
  body('firstName').isString().bail().trim().notEmpty().isLength({ max: 100 }),
  body('lastName').isString().bail().trim().notEmpty().isLength({ max: 100 }),
  body('email').custom(isScalarInput).bail().isEmail().normalizeEmail(),
  body('password').isString().bail().isLength({ min: 8 }),
  body('roleUuids').optional().isArray().bail({ level: 'request' }),
  body('roleUuids.*').optional().custom(isScalarInput).bail().isUUID(),
  body('companyUuids').optional().isArray().bail({ level: 'request' }),
  body('companyUuids.*').optional().custom(isScalarInput).bail().isUUID(),
];
export const updateUserValidator = [
  uuid,
  body('firstName').optional().isString().bail().trim().notEmpty().isLength({ max: 100 }),
  body('lastName').optional().isString().bail().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().custom(isScalarInput).bail().isEmail().normalizeEmail(),
  body('password').optional().isString().bail().isLength({ min: 8 }),
  body('isActive').optional().custom(isScalarInput).bail().isBoolean().toBoolean(),
  body('roleUuids').optional().isArray().bail({ level: 'request' }),
  body('roleUuids.*').optional().custom(isScalarInput).bail().isUUID(),
  body('companyUuids').optional().isArray().bail({ level: 'request' }),
  body('companyUuids.*').optional().custom(isScalarInput).bail().isUUID(),
];
export const userUuidValidator = [uuid];
