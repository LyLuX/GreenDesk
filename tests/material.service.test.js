import { jest } from '@jest/globals';

import MaterialService, {
  parseDateOnly,
} from '../src/modules/materials/service/material.service.js';

const model = (values) => ({ ...values, toJSON: () => ({ ...values }) });

describe('MaterialService', () => {
  const createService = (overrides = {}) => {
    const repository = {
      findAll: jest.fn(),
      findByUuid: jest.fn(),
      findByName: jest.fn().mockResolvedValue(null),
      findByReference: jest.fn().mockResolvedValue(null),
      findBySerialNumber: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      ...overrides,
    };
    const audit = { record: jest.fn(), findByEntity: jest.fn().mockResolvedValue([]) };
    return { repository, audit, service: new MaterialService(repository, audit, {}, {}, {}) };
  };

  it('returns only public fields when listing materials', async () => {
    const { repository, service } = createService({
      findAll: jest.fn().mockResolvedValue({
        count: 1,
        rows: [
          model({
            id: 7,
            uuid: '11111111-1111-4111-8111-111111111111',
            name: 'Tondeuse',
            brandId: 2,
            brand: { uuid: '22222222-2222-4222-8222-222222222222', name: 'Green' },
          }),
        ],
      }),
    });

    await expect(service.getAll({ page: 1, limit: 10 })).resolves.toEqual({
      items: [
        {
          uuid: '11111111-1111-4111-8111-111111111111',
          name: 'Tondeuse',
          brand: { uuid: '22222222-2222-4222-8222-222222222222', name: 'Green' },
          category: null,
          property: null,
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    expect(repository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('rejects a duplicate serial number before persistence', async () => {
    const { repository, service } = createService({
      findBySerialNumber: jest
        .fn()
        .mockResolvedValue(model({ uuid: 'existing', serialNumber: 'SN-1' })),
    });
    await expect(
      service.create({ name: 'Taille-haie', unit: 'u', purchasePrice: 0, serialNumber: 'SN-1' }, 1),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects inconsistent lifecycle dates', async () => {
    const { service } = createService();
    await expect(
      service.create(
        {
          name: 'Brouette',
          unit: 'u',
          purchasePrice: 0,
          purchaseDate: '2026-04-02',
          commissionedAt: '2026-04-01',
        },
        1,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('soft-deletes a material and records the operation', async () => {
    const material = model({
      uuid: '11111111-1111-4111-8111-111111111111',
      name: 'Tondeuse',
    });
    const { repository, audit, service } = createService({
      findByUuid: jest.fn().mockResolvedValue(material),
    });

    await service.remove(material.uuid, 7);

    expect(repository.delete).toHaveBeenCalledWith(material);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        action: 'DELETE',
        entity: 'MATERIAL',
        entityUuid: material.uuid,
      }),
    );
  });

  it('restores a soft-deleted material with the same name', async () => {
    const deletedMaterial = model({
      uuid: '11111111-1111-4111-8111-111111111111',
      name: 'Tondeuse',
      deletedAt: new Date(),
    });
    const { repository, audit, service } = createService({
      findByName: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(deletedMaterial),
    });

    await service.create({ name: 'Tondeuse', unit: 'u', purchasePrice: 0 }, 7);

    expect(repository.restore).toHaveBeenCalledWith(deletedMaterial);
    expect(repository.update).toHaveBeenCalledWith(
      deletedMaterial,
      expect.objectContaining({ active: true, updatedBy: 7 }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESTORE', entity: 'MATERIAL' }),
    );
  });

  it('rejects an invalid calendar date', () => {
    expect(() => parseDateOnly('2026-02-30')).toThrow('La date fournie est invalide.');
  });
});
