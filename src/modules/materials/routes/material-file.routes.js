import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import MaterialFileService from '../service/material-file.service.js';
const uploadDirectory = path.join(process.cwd(), 'uploads', 'materials');
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) =>
    callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) =>
    callback(
      null,
      ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype),
    ),
});
const router = Router();
const service = new MaterialFileService();
router.post(
  '/:uuid/photos',
  authenticate,
  authorize('materials.update'),
  upload.single('file'),
  asyncHandler(async (request, response) =>
    response
      .status(201)
      .json({ success: true, data: await service.add(request.params.uuid, request.file, 'photo') }),
  ),
);
router.post(
  '/:uuid/documents',
  authenticate,
  authorize('materials.update'),
  upload.single('file'),
  asyncHandler(async (request, response) =>
    response.status(201).json({
      success: true,
      data: await service.add(
        request.params.uuid,
        request.file,
        'document',
        request.body.documentType,
      ),
    }),
  ),
);
router.patch(
  '/files/:fileUuid/primary',
  authenticate,
  authorize('materials.update'),
  asyncHandler(async (request, response) =>
    response.json({ success: true, data: await service.setPrimary(request.params.fileUuid) }),
  ),
);
router.delete(
  '/files/:fileUuid',
  authenticate,
  authorize('materials.update'),
  asyncHandler(async (request, response) => {
    await service.remove(request.params.fileUuid);
    response.status(204).send();
  }),
);
export default router;
