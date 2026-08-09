export const cacheControlPolicies = Object.freeze({
  noStore: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  privateRevalidate: 'private, no-cache',
});

const isReadRequest = (method) => method === 'GET' || method === 'HEAD';

/** Selects a safe response cache policy for the runtime environment and resource type. */
export const resolveCacheControl = ({ environment, method, path }) => {
  if (environment !== 'production') return cacheControlPolicies.noStore;
  if (!isReadRequest(method)) return cacheControlPolicies.noStore;
  if (path === '/health') return cacheControlPolicies.noStore;
  if (path === '/docs' || path.startsWith('/docs/')) return cacheControlPolicies.noStore;
  if (/^\/api\/(?:v1\/)?auth(?:\/|$)/.test(path)) return cacheControlPolicies.noStore;
  if (path.startsWith('/api/')) return cacheControlPolicies.privateRevalidate;
  return cacheControlPolicies.noStore;
};
