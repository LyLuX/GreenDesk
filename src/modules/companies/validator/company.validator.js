import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

export const listCompanyValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('active').optional({ values: 'falsy' }).isBoolean(),
  query('deleted').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  query('includeDeleted').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  ...paginationValidator,
];
export const companyUuidValidator = [param('uuid').isUUID()];
export const createCompanyValidator = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
];
export const updateCompanyValidator = [
  ...companyUuidValidator,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('active').optional().isBoolean(),
];
