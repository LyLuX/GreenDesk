import request from 'supertest';

import app from '../src/app.js';
import { compressionOptions, helmetOptions } from '../src/config/http-middleware.js';

describe('HTTP middleware configuration', () => {
  it('applies the hardened Helmet policy to HTTP responses', async () => {
    const response = await request(app).get('/docs/openapi.json');
    const contentSecurityPolicy = response.headers['content-security-policy'];

    expect(contentSecurityPolicy).toEqual(expect.any(String));
    expect(contentSecurityPolicy).toContain("base-uri 'self'");
    expect(contentSecurityPolicy).toContain("connect-src 'self'");
    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).toContain("font-src 'self'");
    expect(contentSecurityPolicy).toContain("form-action 'self'");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy).toContain("frame-src 'none'");
    expect(contentSecurityPolicy).toContain("img-src 'self' data: blob:");
    expect(contentSecurityPolicy).toContain("manifest-src 'none'");
    expect(contentSecurityPolicy).toContain("media-src 'none'");
    expect(contentSecurityPolicy).toContain("object-src 'none'");
    expect(contentSecurityPolicy).toContain("script-src 'self'");
    expect(contentSecurityPolicy).toContain("style-src 'self' 'unsafe-inline'");
    expect(contentSecurityPolicy).toContain("worker-src 'none'");
    expect(response.headers['referrer-policy']).toBe('strict-origin');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
  });

  it('uses benchmarked zlib compression settings and compresses eligible responses', async () => {
    const response = await request(app).get('/docs/openapi.json').set('Accept-Encoding', 'gzip');

    expect(compressionOptions).toEqual({ level: 6, memLevel: 8 });
    expect(response.headers['content-encoding']).toBe('gzip');
  });

  it('keeps the configured asset sources explicit', () => {
    const { directives } = helmetOptions.contentSecurityPolicy;

    expect(directives.fontSrc).toEqual(["'self'"]);
    expect(directives.imgSrc).toEqual(["'self'", 'data:', 'blob:']);
    expect(directives.scriptSrc).toEqual(["'self'"]);
    expect(directives.styleSrc).toEqual(["'self'", "'unsafe-inline'"]);
  });
});
