import { Router } from 'express';

import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { resolveCompanyContext } from '../../../core/middlewares/company-context.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import HistoryController from '../controller/history.controller.js';
import historyPermissions from '../history.permissions.js';
import { historyListValidator } from '../validator/history.validator.js';

const router = Router();
const controller = new HistoryController();

router.use(authenticate, resolveCompanyContext);
router.get(
  '/:section',
  historyListValidator,
  validateRequest,
  (request, response, next) =>
    authorize(historyPermissions[request.params.section])(request, response, next),
  asyncHandler(controller.list.bind(controller)),
);

export default router;
