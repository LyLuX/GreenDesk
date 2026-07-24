import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import BrandController from '../controller/brand.controller.js';
import {
  BRAND_LOGO_EXTENSION_BY_MIME,
  BRAND_LOGO_MAX_SIZE,
  BRAND_LOGO_MIME_TYPES,
} from '../brand-logo.constants.js';
import * as validator from '../validator/brand.validator.js';
const router = Router();
const controller = new BrandController();
const uploadDirectory = path.join(process.cwd(), 'uploads', 'brands');
fs.mkdirSync(uploadDirectory, { recursive: true });
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, file, callback) =>
      callback(null, `${crypto.randomUUID()}${BRAND_LOGO_EXTENSION_BY_MIME[file.mimetype]}`),
  }),
  limits: { fileSize: BRAND_LOGO_MAX_SIZE },
  fileFilter: (_request, file, callback) => {
    const allowed = BRAND_LOGO_MIME_TYPES.includes(file.mimetype);
    callback(allowed ? null : new Error('Unsupported logo type'), allowed);
  },
});
const uploadLogo = (request, response, next) =>
  logoUpload.single('file')(request, response, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Le logo ne doit pas dépasser 2 Mo.', HTTP_STATUS.BAD_REQUEST));
    }
    return next(
      new AppError('Le logo doit être une image JPEG, PNG ou WebP.', HTTP_STATUS.BAD_REQUEST),
    );
  });
router.use(authenticate);
router.get(
  '/',
  authorize('brands.read'),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.post(
  '/',
  authorize('brands.create'),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.get(
  '/:uuid/logo',
  authorize('brands.read'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.logoContent.bind(controller)),
);
router.post(
  '/:uuid/logo',
  authorize('brands.create', 'brands.update'),
  validator.uuidValidator,
  validateRequest,
  uploadLogo,
  asyncHandler(controller.uploadLogo.bind(controller)),
);
router.delete(
  '/:uuid/logo',
  authorize('brands.update'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.removeLogo.bind(controller)),
);
router.put(
  '/:uuid',
  authorize('brands.update'),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize('brands.delete'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
