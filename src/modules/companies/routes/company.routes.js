import { Router } from 'express';

import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import {
  authorize,
  authorizeBodyFields,
} from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
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
