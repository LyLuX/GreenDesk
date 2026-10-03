import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import env from '../src/config/env.js';
import logger from '../src/core/logger/logger.js';
import User from '../src/modules/users/model/user.model.js';
import Company from '../src/modules/companies/model/company.model.js';
import RevokedAccessToken from '../src/modules/auth/model/revoked-access-token.model.js';
import MaterialFileService from '../src/modules/materials/service/material-file.service.js';
import CompanyLogoService from '../src/modules/companies/service/company-logo.service.js';
import ManufacturerLogoService from '../src/modules/manufacturers/service/manufacturer-logo.service.js';

const uuid = randomUUID();
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/kN8AAAAASUVORK5CYII=',
  'base64',
);
const families = [
  ['materials', `/api/v1/materials/${uuid}/photos`, 'materials.photos.create', MaterialFileService],
  ['companies', `/api/v1/companies/${uuid}/logo`, 'companies.logo.update', CompanyLogoService],
  [
    'manufacturers',
    `/api/v1/manufacturers/${uuid}/logo`,
    'manufacturers.logo.upload',
    ManufacturerLogoService,
  ],
];
const token = (permission) =>
  jwt.sign(
    {
      sub: uuid,
      userId: 1,
      authorizationVersion: 0,
      jti: randomUUID(),
      permissions: [permission],
      companyAccess: [{ id: 1, uuid }],
    },
    env.jwt.secret,
    { expiresIn: '5m' },
  );
const snapshot = (directory) => fs.readdir(path.resolve('uploads', directory));

describe('R4 actual upload parsers and disk cleanup', () => {
  let previousSilent;
  beforeAll(() => {
    previousSilent = logger.silent;
    logger.silent = true;
    jest
      .spyOn(User, 'findOne')
      .mockResolvedValue({ id: 1, isActive: true, authorizationVersion: 0 });
    jest.spyOn(RevokedAccessToken, 'findOne').mockResolvedValue(null);
    jest.spyOn(Company, 'findOne').mockResolvedValue({ id: 1, uuid, active: true });
    for (const [, , , Service] of families)
      jest.spyOn(Service.prototype, 'add').mockImplementation(async (_uuid, file) => {
        await fs.unlink(file.path);
        return { uuid: randomUUID(), hasLogo: true };
      });
  });
  afterAll(() => {
    jest.restoreAllMocks();
    logger.silent = previousSilent;
  });
  it.each(families)(
    '%s rejects excessive fields after staging and removes the file',
    async (directory, url, permission, Service) => {
      const before = await snapshot(directory);
      const calls = Service.prototype.add.mock.calls.length;
      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${token(permission)}`)
        .attach('file', png, { filename: 'test.png', contentType: 'image/png' })
        .field('name', 'one')
        .field('extra', 'two');
      expect(response.status).toBe(400);
      expect(await snapshot(directory)).toEqual(before);
      expect(Service.prototype.add.mock.calls.length).toBe(calls);
    },
  );
  it.each(families)(
    '%s rejects oversized fields, a second file and forged signatures',
    async (directory, url, permission, Service) => {
      for (const attack of ['large-field', 'second-file', 'signature', 'mime', 'size']) {
        const before = await snapshot(directory);
        const calls = Service.prototype.add.mock.calls.length;
        let upload = request(app)
          .post(url)
          .set('Authorization', `Bearer ${token(permission)}`);
        const data =
          attack === 'signature'
            ? Buffer.from('R4_FAKE_NOT_AN_IMAGE')
            : attack === 'size'
              ? Buffer.alloc(env.uploads.image.maxSizeBytes + 1)
              : png;
        upload = upload.attach('file', data, {
          filename: 'test.png',
          contentType: attack === 'mime' ? 'text/html' : 'image/png',
        });
        if (attack === 'large-field') upload = upload.field('name', 'x'.repeat(1025));
        if (attack === 'second-file')
          upload = upload.attach('file', png, { filename: 'other.png', contentType: 'image/png' });
        expect((await upload).status).toBe(400);
        expect(await snapshot(directory)).toEqual(before);
        expect(Service.prototype.add.mock.calls.length).toBe(calls);
      }
    },
  );
  it.each(families)('%s preserves a valid image workflow', async (directory, url, permission) => {
    expect(
      (
        await request(app)
          .post(url)
          .set('Authorization', `Bearer ${token(permission)}`)
          .attach('file', png, { filename: 'valid.png', contentType: 'image/png' })
      ).status,
    ).toBe(directory === 'materials' ? 201 : 200);
  });
  it('rejects unknown material metadata and malformed UUIDs without leaving files', async () => {
    const before = await snapshot('materials');
    for (const [url, field] of [
      [families[0][1], 'logoFileName'],
      ['/api/v1/materials/invalid/photos', 'name'],
    ]) {
      const response = await request(app)
        .post(url)
        .set('Authorization', `Bearer ${token('materials.photos.create')}`)
        .attach('file', png, { filename: 'test.png', contentType: 'image/png' })
        .field(field, 'x');
      expect(response.status).toBe(400);
      expect(await snapshot('materials')).toEqual(before);
    }
  });
});
