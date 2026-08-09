export const frontendCacheControlPolicies = Object.freeze({
  noStore: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  html: 'no-cache',
  staticAsset: 'public, max-age=86400, must-revalidate',
  immutableAsset: 'public, max-age=31536000, immutable',
});

const pathnameFromUrl = (url = '/') => url.split(/[?#]/, 1)[0] || '/';

/** Selects browser cache headers for Vite development and production-preview responses. */
export const resolveFrontendCacheControl = ({ environment, url }) => {
  if (environment !== 'production') return frontendCacheControlPolicies.noStore;

  const pathname = pathnameFromUrl(url);
  if (pathname.startsWith('/assets/')) return frontendCacheControlPolicies.immutableAsset;
  if (pathname === '/' || pathname.endsWith('.html') || !pathname.includes('.')) {
    return frontendCacheControlPolicies.html;
  }
  return frontendCacheControlPolicies.staticAsset;
};

const registerCacheMiddleware = (server, environment) => {
  server.middlewares.use((request, response, next) => {
    const cacheControl = resolveFrontendCacheControl({ environment, url: request.url });
    const setHeader = response.setHeader.bind(response);

    setHeader('Cache-Control', cacheControl);
    response.setHeader = (name, value) =>
      setHeader(name, name.toLowerCase() === 'cache-control' ? cacheControl : value);

    if (cacheControl === frontendCacheControlPolicies.noStore) {
      delete request.headers['if-none-match'];
      delete request.headers['if-modified-since'];
      setHeader('Pragma', 'no-cache');
      setHeader('Expires', '0');
      setHeader('Surrogate-Control', 'no-store');
    }

    next();
  });
};

/** Installs the same cache policy in the Vite development and preview servers. */
export const createCacheControlPlugin = (environment) => ({
  name: 'greendesk-cache-control',
  configureServer: (server) => registerCacheMiddleware(server, environment),
  configurePreviewServer: (server) => registerCacheMiddleware(server, environment),
});
