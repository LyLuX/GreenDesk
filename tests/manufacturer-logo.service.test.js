import { jest } from '@jest/globals';

import ManufacturerLogoService from '../src/modules/manufacturers/service/manufacturer-logo.service.js';

const manufacturerModel = (values) => ({
  ...values,
  toJSON() {
    return { ...this };
  },
});

describe('ManufacturerLogoService', () => {
  it('replaces the logo metadata and removes the previous physical file', async () => {
    const manufacturer = manufacturerModel({
      uuid: 'manufacturer-uuid',
      logoFileName: 'old.png',
      logoOriginalName: 'old.png',
      logoMimeType: 'image/png',
    });
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(manufacturer),
      update: jest.fn().mockImplementation(async (item, values) => Object.assign(item, values)),
    };
    const auditService = { record: jest.fn() };
    const service = new ManufacturerLogoService(repository, auditService);
    service.safeDeletePhysicalFile = jest.fn().mockResolvedValue(true);
    const file = {
      filename: 'new.webp',
      originalname: 'logo.webp',
      mimetype: 'image/webp',
      path: 'uploads/manufacturers/new.webp',
    };

    await expect(service.add(manufacturer.uuid, file, 7)).resolves.toEqual({ hasLogo: true });

    expect(repository.update).toHaveBeenCalledWith(
      manufacturer,
      expect.objectContaining({
        logoFileName: 'new.webp',
        logoOriginalName: 'logo.webp',
        logoMimeType: 'image/webp',
        updatedBy: 7,
      }),
    );
    expect(service.safeDeletePhysicalFile).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[\\/]manufacturers[\\/]old\.png$/),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'MANUFACTURER', entityUuid: manufacturer.uuid }),
    );
  });

  it('rejects a missing logo without touching persistence', async () => {
    const repository = { findByUuid: jest.fn(), update: jest.fn() };
    const service = new ManufacturerLogoService(repository, { record: jest.fn() });

    await expect(service.add('manufacturer-uuid', undefined, 7)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Aucun logo fourni.',
    });
    expect(repository.update).not.toHaveBeenCalled();
  });
});
