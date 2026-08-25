import { body, param, query } from 'express-validator';
import { paginationValidator } from '../../../core/validators/pagination.validator.js';

export const listCompanyValidator = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  query('active').optional({ values: 'falsy' }).isBoolean(),
  ...paginationValidator,
];
export const companyUuidValidator = [param('uuid').isUUID()];
export const createCompanyValidator = [
  body('code')
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .matches(/^[A-Za-z0-9_-]+$/),
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
];
export const updateCompanyValidator = [
  ...companyUuidValidator,
  body('code').not().exists().withMessage('Le code d’une société est immuable.'),
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('active').optional().isBoolean(),
];
