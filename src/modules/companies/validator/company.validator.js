import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body, param, query } from 'express-validator';
import { activeFilterValidator } from '../../../core/validators/active-filter.validator.js';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

export const listCompanyValidator = [
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
  ...paginationValidator,
];
export const companyUuidValidator = [param('uuid').custom(isScalarInput).bail().isUUID()];
export const createCompanyValidator = [
  body('name').isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).isString().bail().trim().isLength({ max: 1000 }),
];
export const updateCompanyValidator = [
  ...companyUuidValidator,
  body('name').optional().isString().bail().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).isString().bail().trim().isLength({ max: 1000 }),
  body('active').optional().custom(isScalarInput).bail().isBoolean(),
];
