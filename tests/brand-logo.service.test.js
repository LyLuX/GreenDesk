import { jest } from '@jest/globals';

import BrandLogoService from '../src/modules/brands/service/brand-logo.service.js';

const brandModel = (values) => ({
  ...values,
  toJSON() {
    return { ...this };
  },
});

describe('BrandLogoService', () => {
  it('replaces the logo metadata and removes the previous physical file', async () => {
    const brand = brandModel({
      uuid: 'brand-uuid',
      logoFileName: 'old.png',
      logoOriginalName: 'old.png',
      logoMimeType: 'image/png',
    });
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(brand),
      update: jest.fn().mockImplementation(async (item, values) => Object.assign(item, values)),
    };
    const auditService = { record: jest.fn() };
    const service = new BrandLogoService(repository, auditService);
    service.safeDeletePhysicalFile = jest.fn().mockResolvedValue(true);
    const file = {
      filename: 'new.webp',
      originalname: 'logo.webp',
      mimetype: 'image/webp',
      path: 'uploads/brands/new.webp',
    };

    await expect(service.add(brand.uuid, file, 7)).resolves.toEqual({ hasLogo: true });

    expect(repository.update).toHaveBeenCalledWith(
      brand,
      expect.objectContaining({
        logoFileName: 'new.webp',
        logoOriginalName: 'logo.webp',
        logoMimeType: 'image/webp',
        updatedBy: 7,
      }),
    );
    expect(service.safeDeletePhysicalFile).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[\\/]brands[\\/]old\.png$/),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'BRAND', entityUuid: brand.uuid }),
    );
  });

  it('rejects a missing logo without touching persistence', async () => {
    const repository = { findByUuid: jest.fn(), update: jest.fn() };
    const service = new BrandLogoService(repository, { record: jest.fn() });

    await expect(service.add('brand-uuid', undefined, 7)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Aucun logo fourni.',
    });
    expect(repository.update).not.toHaveBeenCalled();
  });
});
