import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import AppError from '../../../core/errors/app-error.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import MaterialFileService from '../service/material-file.service.js';
const uploadDirectory = path.join(process.cwd(), 'uploads', 'materials');
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) =>
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const makeUpload = (types) =>
  multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) =>
      callback(
        types.includes(file.mimetype) ? null : new Error('Unsupported file type'),
        types.includes(file.mimetype),
      ),
  });
const photoUpload = makeUpload(['image/jpeg', 'image/png', 'image/webp']);
const documentUpload = makeUpload(['application/pdf']);
const router = Router();
const service = new MaterialFileService();
const upload = (middleware) => (request, response, next) =>
  middleware(request, response, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE')
      return next(new AppError('File size must not exceed 10 MB', HTTP_STATUS.BAD_REQUEST));
    return next(new AppError('The selected file type is not allowed', HTTP_STATUS.BAD_REQUEST));
  });
router.post(
  '/:uuid/photos',
  authenticate,
  authorize('materials.update'),
  upload(photoUpload.single('file')),
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
  upload(documentUpload.single('file')),
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
router.get(
  '/files/:fileUuid/download',
  authenticate,
  authorize('materials.read'),
  asyncHandler(async (request, response) => {
    const file = await service.getForDownload(request.params.fileUuid);
    response.download(path.join(uploadDirectory, file.fileName), file.originalName);
  }),
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
