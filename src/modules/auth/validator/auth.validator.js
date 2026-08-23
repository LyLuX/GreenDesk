import { body } from 'express-validator';

export const registerValidator = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
];
export const loginValidator = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];
export const verifyEmailValidator = [body('token').isString().isLength({ min: 40, max: 200 })];
export const resendEmailVerificationValidator = [body('email').isEmail().normalizeEmail()];
