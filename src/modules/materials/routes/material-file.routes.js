import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Router } from 'express';
import env from '../../../config/env.js';
import { authenticate } from '../../../core/middlewares/auth.middleware.js';
import { resolveCompanyContext } from '../../../core/middlewares/company-context.middleware.js';
import { authorize } from '../../../core/middlewares/authorization.middleware.js';
import fleetPermissions from '../../../core/constants/fleet-permissions.js';
import { createFileSignatureValidator } from '../../../core/middlewares/file-signature.middleware.js';
import { asyncHandler } from '../../../core/utils/async-handler.js';
import AppError from '../../../core/errors/app-error.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import MaterialFileService from '../service/material-file.service.js';
import {
  DOCUMENT_MIME_TYPES,
  MIME_EXTENSION_MAP,
  PHOTO_MIME_TYPES,
} from '../material-file.constants.js';
const uploadDirectory = path.join(process.cwd(), 'uploads', 'materials');
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) =>
    callback(null, `${crypto.randomUUID()}${MIME_EXTENSION_MAP[file.mimetype]}`),
});
const makeUpload = (types, maxSizeBytes) =>
  multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (_request, file, callback) =>
      callback(
        types.includes(file.mimetype) ? null : new Error('Unsupported file type'),
        types.includes(file.mimetype),
      ),
  });
const photoUpload = makeUpload(PHOTO_MIME_TYPES, env.uploads.image.maxSizeBytes);
const documentUpload = makeUpload(DOCUMENT_MIME_TYPES, env.uploads.document.maxSizeBytes);
const validatePhotoSignature = createFileSignatureValidator(
  PHOTO_MIME_TYPES,
  'Le contenu du fichier ne correspond pas à une signature JPEG, PNG ou WebP autorisée.',
);
const validateDocumentSignature = createFileSignatureValidator(
  DOCUMENT_MIME_TYPES,
  'Le contenu du fichier ne correspond pas à une signature PDF autorisée.',
);
const router = Router();
const service = new MaterialFileService();
router.use(authenticate, resolveCompanyContext);
const upload = (middleware, maxSizeMb) => (request, response, next) =>
  middleware(request, response, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE')
      return next(
        new AppError(`Le fichier ne doit pas dépasser ${maxSizeMb} Mo.`, HTTP_STATUS.BAD_REQUEST),
      );
    return next(new AppError('The selected file type is not allowed', HTTP_STATUS.BAD_REQUEST));
  });
router.post(
  '/:uuid/photos',
  authorize(fleetPermissions.materials.photos.create),
  upload(photoUpload.single('file'), env.uploads.image.maxSizeMb),
  validatePhotoSignature,
  asyncHandler(async (request, response) =>
    response.status(201).json({
      success: true,
      data: await service.add(request.params.uuid, request.file, 'photo', {
        name: request.body.name,
      }),
    }),
  ),
);
router.post(
  '/:uuid/documents',
  authorize(fleetPermissions.materials.documents.create),
  upload(documentUpload.single('file'), env.uploads.document.maxSizeMb),
  validateDocumentSignature,
  asyncHandler(async (request, response) =>
    response.status(201).json({
      success: true,
      data: await service.add(request.params.uuid, request.file, 'document', {
        documentType: request.body.documentType,
      }),
    }),
  ),
);
router.patch(
  '/files/:fileUuid/primary',
  authorize(fleetPermissions.materials.photos.setPrimary),
  asyncHandler(async (request, response) =>
    response.json({ success: true, data: await service.setPrimary(request.params.fileUuid) }),
  ),
);
router.get(
  '/files/:fileUuid/content',
  authorize(fleetPermissions.materials.read),
  asyncHandler(async (request, response) => {
    const file = await service.getForContent(request.params.fileUuid);
    response.type(file.mimeType);
    response.setHeader('Content-Disposition', 'inline');
    response.sendFile(path.resolve(uploadDirectory, file.fileName));
  }),
);
router.get(
  '/files/:fileUuid/download',
  authorize(fleetPermissions.materials.read),
  asyncHandler(async (request, response) => {
    const file = await service.getForDownload(request.params.fileUuid);
    response.download(path.resolve(uploadDirectory, file.fileName), file.originalName);
  }),
);
router.delete(
  '/files/:fileUuid',
  authorize(fleetPermissions.materials.files.delete),
  asyncHandler(async (request, response) => {
    await service.remove(request.params.fileUuid);
    response.status(204).send();
  }),
);
export default router;
