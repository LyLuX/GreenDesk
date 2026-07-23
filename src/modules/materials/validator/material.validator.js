import { body, param, query } from 'express-validator';
const uuid = param('uuid').isUUID();
export const listValidator = [query('search').optional().trim().isLength({ max: 150 })];
export const uuidValidator = [uuid];
export const createValidator = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('reference').optional().trim().isLength({ max: 100 }),
  body('unit').trim().notEmpty().isLength({ max: 50 }),
  body('purchasePrice').isFloat({ min: 0 }).toFloat(),
  body('salePrice').isFloat({ min: 0 }).toFloat(),
];
export const updateValidator = [
  uuid,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('reference').optional().trim().isLength({ max: 100 }),
  body('unit').optional().trim().notEmpty().isLength({ max: 50 }),
  body('purchasePrice').optional().isFloat({ min: 0 }).toFloat(),
  body('salePrice').optional().isFloat({ min: 0 }).toFloat(),
];
export const statusValidator = [uuid, body('active').isBoolean().toBoolean()];
