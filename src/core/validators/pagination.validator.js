import { query } from 'express-validator';

import { PAGE_LIMITS } from '../utils/pagination.js';

/** Shared bounded pagination accepted by every collection endpoint. */
export const paginationValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit')
    .optional()
    .isInt()
    .custom((value) => PAGE_LIMITS.includes(Number(value)))
    .withMessage(`limit must be one of: ${PAGE_LIMITS.join(', ')}`)
    .toInt(),
];
