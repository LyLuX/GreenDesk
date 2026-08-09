export const cacheControlPolicies = Object.freeze({
  noStore: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  privateRevalidate: 'private, no-cache',
  publicRevalidate: 'no-cache',
  publicShort: 'public, max-age=300, must-revalidate',
  publicStatic: 'public, max-age=86400, must-revalidate',
});

const swaggerStaticPaths = new Set([
  '/docs/favicon-16x16.png',
  '/docs/favicon-32x32.png',
  '/docs/swagger-ui-bundle.js',
  '/docs/swagger-ui-standalone-preset.js',
  '/docs/swagger-ui.css',
]);

const isReadRequest = (method) => method === 'GET' || method === 'HEAD';

/** Selects a safe response cache policy for the runtime environment and resource type. */
export const resolveCacheControl = ({ environment, method, path }) => {
  if (environment !== 'production') return cacheControlPolicies.noStore;
  if (!isReadRequest(method)) return cacheControlPolicies.noStore;
  if (path === '/health') return cacheControlPolicies.noStore;
  if (/^\/api\/(?:v1\/)?auth(?:\/|$)/.test(path)) return cacheControlPolicies.noStore;
  if (path === '/docs/openapi.json' || path === '/docs/swagger-ui-init.js') {
    return cacheControlPolicies.publicShort;
  }
  if (swaggerStaticPaths.has(path)) return cacheControlPolicies.publicStatic;
  if (path === '/docs' || path === '/docs/') return cacheControlPolicies.publicRevalidate;
  if (path.startsWith('/api/')) return cacheControlPolicies.privateRevalidate;
  return cacheControlPolicies.noStore;
};
