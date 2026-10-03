import { isScalarInput } from './scalar-input.js';
import { query } from 'express-validator';

import { MAX_PAGE, PAGE_LIMITS } from '../utils/pagination.js';

/** Shared bounded pagination accepted by every collection endpoint. */
export const paginationValidator = [
  query('page').optional().custom(isScalarInput).bail().isInt({ min: 1, max: MAX_PAGE }).toInt(),
  query('limit')
    .optional()
    .custom(isScalarInput)
    .bail()
    .isInt()
    .custom((value) => PAGE_LIMITS.includes(Number(value)))
    .withMessage(`limit must be one of: ${PAGE_LIMITS.join(', ')}`)
    .toInt(),
];
