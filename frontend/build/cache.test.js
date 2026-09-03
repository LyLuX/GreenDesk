import { describe, expect, it, vi } from 'vitest';

import {
  createCacheControlPlugin,
  frontendCacheControlPolicies,
  resolveFrontendCacheControl,
} from './cache.js';

describe('frontend cache policy', () => {
  it.each(['development', 'test'])('disables caching in %s', (environment) => {
    expect(resolveFrontendCacheControl({ environment, url: '/assets/app.js' })).toBe(
      frontendCacheControlPolicies.noStore,
    );
  });

  it('revalidates production HTML and long-caches fingerprinted assets', () => {
    expect(resolveFrontendCacheControl({ environment: 'production', url: '/' })).toBe(
      frontendCacheControlPolicies.html,
    );
    expect(
      resolveFrontendCacheControl({ environment: 'production', url: '/materials?page=2' }),
    ).toBe(frontendCacheControlPolicies.html);
    expect(
      resolveFrontendCacheControl({
        environment: 'production',
        url: '/assets/index-Np56UyNI.css',
      }),
    ).toBe(frontendCacheControlPolicies.immutableAsset);
    expect(
      resolveFrontendCacheControl({ environment: 'production', url: '/logo-greendesk.jpg' }),
    ).toBe(frontendCacheControlPolicies.staticAsset);
  });

  it('installs complete no-cache headers in the development server', () => {
    let middleware;
    const setHeader = vi.fn();
    const next = vi.fn();
    const plugin = createCacheControlPlugin('development');
    const response = { setHeader };
    const request = {
      url: '/src/main.jsx',
      headers: { 'if-none-match': 'old-etag', 'if-modified-since': 'yesterday' },
    };

    plugin.configureServer({ middlewares: { use: (handler) => (middleware = handler) } });
    middleware(request, response, next);
    response.setHeader('Cache-Control', 'no-cache');

    expect(setHeader).toHaveBeenCalledWith('Cache-Control', frontendCacheControlPolicies.noStore);
    expect(setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(setHeader).toHaveBeenCalledWith('Expires', '0');
    expect(setHeader).toHaveBeenCalledWith('Surrogate-Control', 'no-store');
    expect(setHeader).not.toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(request.headers).toEqual({});
    expect(next).toHaveBeenCalledOnce();
  });
});
