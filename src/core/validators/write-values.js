import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

/** Rejects unknown fields before any lookup or persistence and copies only own values. */
export function writeValues(values, allowedFields) {
  if (
    !values ||
    typeof values !== 'object' ||
    Array.isArray(values) ||
    Object.keys(values).some((field) => !allowedFields.includes(field))
  ) {
    throw new AppError('La demande contient des champs non autorisés.', HTTP_STATUS.BAD_REQUEST);
  }
  return Object.fromEntries(
    allowedFields
      .filter((field) => Object.hasOwn(values, field))
      .map((field) => [field, values[field]]),
  );
}
