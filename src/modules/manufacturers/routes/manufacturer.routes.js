import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import { createFileSignatureValidator } from '../../../core/middlewares/file-signature.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import ManufacturerController from '../controller/manufacturer.controller.js';
import {
  MANUFACTURER_LOGO_EXTENSION_BY_MIME,
  MANUFACTURER_LOGO_MAX_SIZE,
  MANUFACTURER_LOGO_MIME_TYPES,
} from '../manufacturer-logo.constants.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';
import * as validator from '../validator/manufacturer.validator.js';
const router = Router();
const controller = new ManufacturerController();
const uploadDirectory = path.join(process.cwd(), 'uploads', 'manufacturers');
fs.mkdirSync(uploadDirectory, { recursive: true });
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, file, callback) =>
      callback(null, `${crypto.randomUUID()}${MANUFACTURER_LOGO_EXTENSION_BY_MIME[file.mimetype]}`),
  }),
  limits: { fileSize: MANUFACTURER_LOGO_MAX_SIZE },
  fileFilter: (_request, file, callback) => {
    const allowed = MANUFACTURER_LOGO_MIME_TYPES.includes(file.mimetype);
    callback(allowed ? null : new Error('Unsupported logo type'), allowed);
  },
});
const validateLogoSignature = createFileSignatureValidator(
  MANUFACTURER_LOGO_MIME_TYPES,
  'Le contenu du fichier ne correspond pas à une signature JPEG, PNG ou WebP autorisée.',
);
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
  authorize('manufacturers.read', maintenancePermissions.parts.read),
  validator.listValidator,
  validateRequest,
  asyncHandler(controller.getAll.bind(controller)),
);
router.post(
  '/',
  authorize('manufacturers.create'),
  validator.createValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.get(
  '/:uuid/logo',
  authorize(
    'manufacturers.read',
    'materials.read',
    maintenancePermissions.parts.read,
    maintenancePermissions.plans.read,
  ),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.logoContent.bind(controller)),
);
router.post(
  '/:uuid/logo',
  authorize('manufacturers.create', 'manufacturers.update'),
  validator.uuidValidator,
  validateRequest,
  uploadLogo,
  validateLogoSignature,
  asyncHandler(controller.uploadLogo.bind(controller)),
);
router.delete(
  '/:uuid/logo',
  authorize('manufacturers.update'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.removeLogo.bind(controller)),
);
router.put(
  '/:uuid',
  authorize('manufacturers.update'),
  validator.updateValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize('manufacturers.delete'),
  validator.uuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
