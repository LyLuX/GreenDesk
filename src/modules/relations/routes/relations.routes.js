import { Router } from 'express';

import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { resolveCompanyContext } from '../../../core/middlewares/company-context.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import RelationsController from '../controller/relations.controller.js';
import relationsPermissions from '../relations.permissions.js';
import { relationGraphValidator } from '../validator/relations.validator.js';

const router = Router();
const controller = new RelationsController();

router.get(
  '/',
  authenticate,
  resolveCompanyContext,
  authorize(relationsPermissions.read),
  relationGraphValidator,
  validateRequest,
  asyncHandler(controller.getGraph.bind(controller)),
);

export default router;
