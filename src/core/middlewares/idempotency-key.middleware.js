import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
export const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const keyPattern = /^[A-Za-z0-9._:-]+$/;

/** Requires one bounded opaque key on API writes whose side effects must not be replayed. */
export function requireIdempotencyKey(request, _response, next) {
  const key = request.get(IDEMPOTENCY_KEY_HEADER);
  if (!key) {
    return next(
      new AppError(
        `L’en-tête ${IDEMPOTENCY_KEY_HEADER} est obligatoire pour cette opération.`,
        HTTP_STATUS.BAD_REQUEST,
      ),
    );
  }
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH || !keyPattern.test(key)) {
    return next(
      new AppError(
        `L’en-tête ${IDEMPOTENCY_KEY_HEADER} doit contenir au maximum ${MAX_IDEMPOTENCY_KEY_LENGTH} caractères alphanumériques ou . _ : -.`,
        HTTP_STATUS.BAD_REQUEST,
      ),
    );
  }
  request.idempotencyKey = key;
  return next();
}
