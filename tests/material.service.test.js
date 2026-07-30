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
      findBySerialNumber: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      ...overrides,
    };
    const audit = { record: jest.fn(), findByEntity: jest.fn().mockResolvedValue([]) };
    return { repository, audit, service: new MaterialService(repository, audit, {}, {}) };
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
            manufacturerId: 2,
            manufacturer: {
              uuid: '22222222-2222-4222-8222-222222222222',
              name: 'Green',
              logoFileName: 'green.png',
            },
          }),
        ],
      }),
    });

    await expect(service.getAll({ page: 1, limit: 10 })).resolves.toEqual({
      items: [
        {
          uuid: '11111111-1111-4111-8111-111111111111',
          name: 'Tondeuse',
          manufacturer: {
            uuid: '22222222-2222-4222-8222-222222222222',
            name: 'Green',
            hasLogo: true,
          },
          category: null,
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    expect(repository.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      manufacturerUuid: undefined,
    });
  });

  it('returns every material without pagination when requested', async () => {
    const { service } = createService({
      findAll: jest.fn().mockResolvedValue({ count: 125, rows: [] }),
    });

    await expect(service.getAll({ limit: 'all' })).resolves.toEqual({
      items: [],
      pagination: { page: 1, limit: 125, total: 125, totalPages: 1 },
    });
  });

  it('replaces relation ids with names in material history', async () => {
    const material = model({ uuid: '11111111-1111-4111-8111-111111111111' });
    const { audit, service } = createService({
      findByUuid: jest.fn().mockResolvedValue(material),
    });
    service.manufacturerRepository = {
      findByIds: jest.fn().mockResolvedValue([model({ id: 2, name: 'Green' })]),
    };
    service.categoryRepository = {
      findByIds: jest.fn().mockResolvedValue([model({ id: 3, name: 'Jardin' })]),
    };
    audit.findByEntity.mockResolvedValue([
      model({
        id: 9,
        userId: 7,
        uuid: '22222222-2222-4222-8222-222222222222',
        oldValues: { name: 'Tondeuse', manufacturerId: 2, purchasePrice: '25.50' },
        newValues: {
          name: 'Tondeuse pro',
          brandId: 2,
          categoryId: 3,
          purchasePrice: 25.5,
        },
      }),
    ]);

    await expect(service.getHistory(material.uuid)).resolves.toEqual([
      {
        uuid: '22222222-2222-4222-8222-222222222222',
        oldValues: { name: 'Tondeuse', purchasePrice: 25.5, manufacturer: 'Green' },
        newValues: {
          name: 'Tondeuse pro',
          purchasePrice: 25.5,
          manufacturer: 'Green',
          category: 'Jardin',
        },
      },
    ]);
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
