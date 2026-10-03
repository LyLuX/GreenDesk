import fs from 'node:fs/promises';
import { writeValues } from '../validators/write-values.js';
import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

/** Bounds retained multipart text independently of the per-file byte limit. */
export const uploadLimits = (fileSize, fields = 0) => ({
  fileSize,
  files: 1,
  fields,
  parts: fields + 2,
  fieldNameSize: 100,
  fieldSize: 1024,
});

export function uploadLimitError(error) {
  if (
    [
      'LIMIT_FIELD_COUNT',
      'LIMIT_FIELD_VALUE',
      'LIMIT_FIELD_KEY',
      'LIMIT_PART_COUNT',
      'LIMIT_FILE_COUNT',
      'LIMIT_UNEXPECTED_FILE',
    ].includes(error.code)
  ) {
    return new AppError(
      'Le formulaire de fichier dépasse les limites autorisées.',
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return null;
}

/** Validates staged multipart metadata and removes the file on any rejection. */
export const validateUploadFields = (fields) => async (request, _response, next) => {
  try {
    request.body = writeValues(request.body ?? {}, fields);
    if (request.file?.originalname.length > 255)
      throw new AppError('Le nom du fichier est trop long.', HTTP_STATUS.BAD_REQUEST);
    return next();
  } catch (error) {
    if (request.file?.path) {
      try {
        await fs.unlink(request.file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT')
          return next(
            new AppError(
              'Impossible de supprimer le fichier rejeté.',
              HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ),
          );
      }
    }
    return next(error);
  }
};
