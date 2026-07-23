import { body, param } from 'express-validator';

const uuid = param('uuid').isUUID().withMessage('uuid must be valid');
export const createUserValidator = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
];
export const updateUserValidator = [
  uuid,
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 8 }),
  body('isActive').optional().isBoolean().toBoolean(),
];
export const userUuidValidator = [uuid];
