import { isScalarInput } from '../../../core/validators/scalar-input.js';
import { body } from 'express-validator';

export const registerValidator = [
  body('firstName').isString().bail().trim().notEmpty().isLength({ max: 100 }),
  body('lastName').isString().bail().trim().notEmpty().isLength({ max: 100 }),
  body('email').custom(isScalarInput).bail().isEmail().normalizeEmail(),
  body('password').isString().bail().isLength({ min: 8 }),
];
export const loginValidator = [
  body('email').custom(isScalarInput).bail().isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];
export const verifyEmailValidator = [body('token').isString().isLength({ min: 40, max: 200 })];
export const resendEmailVerificationValidator = [
  body('email').custom(isScalarInput).bail().isEmail().normalizeEmail(),
];
