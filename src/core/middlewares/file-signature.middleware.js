import fs from 'node:fs/promises';

import { fileTypeFromFile } from 'file-type';

import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';
import logger from '../logger/logger.js';

const removeRejectedFile = async (filePath, removeFile, securityLogger) => {
  try {
    await removeFile(filePath);
  } catch (error) {
    securityLogger.error('Unable to remove rejected upload', { error, filePath });
    throw new AppError(
      'Impossible de supprimer le fichier rejeté.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};

/** Verifies a disk upload from its binary signature and removes every rejected file. */
export const createFileSignatureValidator = (
  allowedMimeTypes,
  invalidTypeMessage,
  { detectFileType = fileTypeFromFile, removeFile = fs.unlink, securityLogger = logger } = {},
) =>
  async function validateFileSignature(request, _response, next) {
    if (!request.file?.path) return next();

    let detectedType;
    try {
      detectedType = await detectFileType(request.file.path);
    } catch (error) {
      securityLogger.warn('Uploaded file signature could not be identified', {
        error,
        filePath: request.file.path,
      });
      try {
        await removeRejectedFile(request.file.path, removeFile, securityLogger);
      } catch (cleanupError) {
        return next(cleanupError);
      }
      return next(new AppError(invalidTypeMessage, HTTP_STATUS.BAD_REQUEST));
    }

    const detectedMimeType = detectedType?.mime;
    if (
      !detectedMimeType ||
      detectedMimeType !== request.file.mimetype ||
      !allowedMimeTypes.includes(detectedMimeType)
    ) {
      try {
        await removeRejectedFile(request.file.path, removeFile, securityLogger);
      } catch (error) {
        return next(error);
      }
      return next(new AppError(invalidTypeMessage, HTTP_STATUS.BAD_REQUEST));
    }

    request.file.mimetype = detectedMimeType;
    return next();
  };
