import env from './env.js';

/** Restricts browser cross-origin access to the explicitly configured origins. */
export const createCorsOptions = (allowedOrigins = env.corsOrigins) => ({
  origin: allowedOrigins,
  credentials: false,
});
