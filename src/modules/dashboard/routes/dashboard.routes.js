import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { resolveCompanyContext } from '../../../core/middlewares/company-context.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import DashboardController from '../controller/dashboard.controller.js';
import dashboardPermissions from '../dashboard.permissions.js';
const router = Router();
const controller = new DashboardController();
router.get(
  '/summary',
  authenticate,
  resolveCompanyContext,
  authorize(dashboardPermissions.read),
  asyncHandler(controller.summary.bind(controller)),
);
export default router;
