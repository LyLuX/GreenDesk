/** Wraps async Express handlers so failures reach the global error middleware. */
export const asyncHandler = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);
