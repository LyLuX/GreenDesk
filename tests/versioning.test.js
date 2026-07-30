import { readFileSync } from 'node:fs';

import appVersion from '../src/config/app-version.js';
import swaggerSpec from '../src/config/swagger.js';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

describe('GreenDesk semantic versioning', () => {
  it('keeps every application version synchronized', () => {
    const backendPackage = readJson('../package.json');
    const backendLock = readJson('../package-lock.json');
    const frontendPackage = readJson('../frontend/package.json');
    const frontendLock = readJson('../frontend/package-lock.json');

    expect(appVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(frontendPackage.version).toBe(appVersion);
    expect(backendLock.version).toBe(appVersion);
    expect(backendLock.packages[''].version).toBe(appVersion);
    expect(frontendLock.version).toBe(appVersion);
    expect(frontendLock.packages[''].version).toBe(appVersion);
    expect(swaggerSpec.info.version).toBe(appVersion);
    expect(backendPackage.version).toBe(appVersion);
  });
});
