import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../../core/middlewares/validate-request.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import RoleController from '../controller/role.controller.js';
import {
  createRoleValidator,
  roleUuidValidator,
  updateRoleValidator,
} from '../validator/role.validator.js';

const router = Router();
const controller = new RoleController();
router.use(authenticate);
router.get('/', asyncHandler(controller.getAll.bind(controller)));
router.post(
  '/',
  createRoleValidator,
  validateRequest,
  asyncHandler(controller.create.bind(controller)),
);
router.put(
  '/:uuid',
  updateRoleValidator,
  validateRequest,
  asyncHandler(controller.update.bind(controller)),
);
router.delete(
  '/:uuid',
  roleUuidValidator,
  validateRequest,
  asyncHandler(controller.remove.bind(controller)),
);
export default router;
