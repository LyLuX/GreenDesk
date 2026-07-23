/**
 * Creates a successful API payload.
 *
 * @param {object} [data={}] - Response data.
 * @param {string} [message] - Optional client-facing message.
 * @returns {{success: true, data: object, message?: string}}
 */
export function successResponse(data = {}, message) {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
}
