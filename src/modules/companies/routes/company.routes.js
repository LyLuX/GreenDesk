import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Router } from 'express';

import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import {
  authorize,
  authorizeBodyFields,
} from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { createFileSignatureValidator } from '../../../core/middlewares/file-signature.middleware.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import {
  COMPANY_LOGO_EXTENSION_BY_MIME,
  COMPANY_LOGO_MAX_SIZE,
  COMPANY_LOGO_MIME_TYPES,
} from '../company-logo.constants.js';
import companyPermissions from '../company.permissions.js';
import CompanyController from '../controller/company.controller.js';
import {
  companyUuidValidator,
  createCompanyValidator,
  listCompanyValidator,
  updateCompanyValidator,
} from '../validator/company.validator.js';

const router = Router();
const controller = new CompanyController();
const uploadDirectory = path.join(process.cwd(), 'uploads', 'companies');
fs.mkdirSync(uploadDirectory, { recursive: true });
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, file, callback) =>
      callback(null, `${crypto.randomUUID()}${COMPANY_LOGO_EXTENSION_BY_MIME[file.mimetype]}`),
  }),
  limits: { fileSize: COMPANY_LOGO_MAX_SIZE },
  fileFilter: (_request, file, callback) => {
    const allowed = COMPANY_LOGO_MIME_TYPES.includes(file.mimetype);
    callback(allowed ? null : new Error('Unsupported logo type'), allowed);
  },
});
const validateLogoSignature = createFileSignatureValidator(
  COMPANY_LOGO_MIME_TYPES,
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
const authorizeDeletedCompanyListing = (request, response, next) => {
  if (!request.query.deleted && !request.query.includeDeleted) return next();
  return authorize(companyPermissions.deleted.read)(request, response, next);
};

router.use(authenticate);
router.get(
  '/',
  authorize(companyPermissions.read),
  listCompanyValidator,
  validateRequest,
  authorizeDeletedCompanyListing,
  asyncHandler(controller.getAll.bind(controller)),
);
router.get(
  '/:uuid/logo',
  companyUuidValidator,
  validateRequest,
  asyncHandler(controller.logoContent.bind(controller)),
);
router.post(
  '/:uuid/logo',
  authorize(companyPermissions.logo.update),
  companyUuidValidator,
  validateRequest,
  uploadLogo,
  validateLogoSignature,
  asyncHandler(controller.uploadLogo.bind(controller)),
);
router.delete(
  '/:uuid/logo',
  authorize(companyPermissions.logo.update),
  companyUuidValidator,
  validateRequest,
  asyncHandler(controller.removeLogo.bind(controller)),
);
router.get(
  '/:uuid',
  authorize(companyPermissions.read),
  companyUuidValidator,
  validateRequest,
  asyncHandler(controller.getByUuid.bind(controller)),
);
router.post(
  '/',
  authorize(companyPermissions.create),
  createCompanyValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  authorize(companyPermissions.update, companyPermissions.status.update),
  authorizeBodyFields(companyPermissions.update, { active: companyPermissions.status.update }),
  updateCompanyValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  authorize(companyPermissions.delete),
  companyUuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
router.post(
  '/:uuid/restore',
  authorize(companyPermissions.deleted.update),
  companyUuidValidator,
  validateRequest,
  asyncHandler(controller.restore.bind(controller)),
);

export default router;
