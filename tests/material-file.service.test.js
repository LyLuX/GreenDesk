import { jest } from '@jest/globals';

import MaterialFileService from '../src/modules/materials/service/material-file.service.js';

const transaction = { id: 'transaction' };

describe('MaterialFileService', () => {
  const createService = (overrides = {}, materialService = { getEntityByUuid: jest.fn() }) =>
    new MaterialFileService(
      {
        countPhotos: jest.fn(),
        create: jest.fn(),
        findByUuid: jest.fn(),
        remove: jest.fn(),
        withTransaction: jest.fn((callback) => callback(transaction)),
        ...overrides,
      },
      materialService,
      { record: jest.fn() },
    );

  it('rejects an upload without a file', async () => {
    await expect(createService().add('uuid', undefined, 'photo')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Aucun fichier fourni.',
    });
  });

  it('rejects an unsupported document classification', async () => {
    await expect(
      createService().add(
        'uuid',
        {
          filename: 'random.pdf',
          originalname: 'manual.pdf',
          mimetype: 'application/pdf',
          size: 1,
        },
        'document',
        { documentType: 'unknown' },
      ),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Le type de document est invalide.' });
  });

  it('trims and persists an optional material photo name', async () => {
    const create = jest.fn().mockResolvedValue({
      toJSON: () => ({ uuid: 'photo-uuid', kind: 'photo', name: 'Vue du moteur' }),
    });
    const service = createService(
      { countPhotos: jest.fn().mockResolvedValue(0), create },
      { getEntityByUuid: jest.fn().mockResolvedValue({ id: 12 }) },
    );
    const file = {
      filename: 'stored.jpg',
      originalname: 'IMG_1234.jpg',
      mimetype: 'image/jpeg',
      size: 125,
    };

    await expect(
      service.add('material-uuid', file, 'photo', { name: '  Vue du moteur  ', userId: 7 }),
    ).resolves.toEqual(expect.objectContaining({ name: 'Vue du moteur' }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Vue du moteur', originalName: 'IMG_1234.jpg' }),
      { transaction },
    );
  });

  it('records each photo with its actor and display name in the upload transaction', async () => {
    const service = createService(
      {
        countPhotos: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ uuid: 'photo' }),
      },
      { getEntityByUuid: jest.fn().mockResolvedValue({ id: 12 }) },
    );
    const file = { mimetype: 'image/jpeg', originalname: 'moteur.jpg' };
    await service.add('material-uuid', file, 'photo', { userId: 7, name: ' Vue moteur ' });
    expect(service.auditService.record).toHaveBeenCalledWith(
      {
        userId: 7,
        action: 'PHOTO_ADD',
        entity: 'MATERIAL',
        entityUuid: 'material-uuid',
        newValues: { photo: 'Vue moteur' },
      },
      { transaction },
    );
    await service.add('material-uuid', file, 'photo', { userId: 7 });
    expect(service.auditService.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ newValues: { photo: 'moteur.jpg' } }),
      { transaction },
    );
  });

  it('aborts the transaction and cleans up the upload if auditing fails', async () => {
    const service = createService(
      {
        countPhotos: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ uuid: 'photo' }),
      },
      { getEntityByUuid: jest.fn().mockResolvedValue({ id: 12 }) },
    );
    service.auditService.record.mockRejectedValue(new Error('audit failed'));
    service.safeDeletePhysicalFile = jest.fn();
    await expect(
      service.add(
        'material-uuid',
        { path: 'temporary-file', mimetype: 'image/jpeg', originalname: 'photo.jpg' },
        'photo',
        { userId: 7 },
      ),
    ).rejects.toThrow('audit failed');
    expect(service.safeDeletePhysicalFile).toHaveBeenCalledWith('temporary-file');
  });

  it('rejects a material photo name longer than 150 characters', async () => {
    const cleanup = jest.fn().mockResolvedValue(true);
    const service = createService();
    service.safeDeletePhysicalFile = cleanup;
    const file = { path: 'temporary-file', mimetype: 'image/jpeg' };

    await expect(
      service.add('material-uuid', file, 'photo', { name: 'a'.repeat(151) }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(cleanup).toHaveBeenCalledWith('temporary-file');
  });

  it('removes a written file when the material does not exist', async () => {
    const cleanup = jest.fn().mockResolvedValue(true);
    const service = createService(
      {},
      { getEntityByUuid: jest.fn().mockRejectedValue(new Error('missing')) },
    );
    service.safeDeletePhysicalFile = cleanup;
    await expect(
      service.add('uuid', { path: 'temporary-file', mimetype: 'image/jpeg' }, 'photo'),
    ).rejects.toThrow('missing');
    expect(cleanup).toHaveBeenCalledWith('temporary-file');
  });

  it('removes the database row when the physical file was already absent', async () => {
    const file = { uuid: 'file', fileName: 'missing.jpg' };
    const repository = { findByUuid: jest.fn().mockResolvedValue(file), remove: jest.fn() };
    const service = createService(repository);
    service.safeDeletePhysicalFile = jest.fn().mockResolvedValue(false);
    await service.remove('file');
    expect(repository.remove).toHaveBeenCalledWith(file, { transaction });
  });

  it('keeps the database row when physical deletion fails', async () => {
    const file = { uuid: 'file', fileName: 'protected.jpg' };
    const repository = { findByUuid: jest.fn().mockResolvedValue(file), remove: jest.fn() };
    const service = createService(repository);
    service.safeDeletePhysicalFile = jest.fn().mockRejectedValue(new Error('disk error'));
    await expect(service.remove('file')).rejects.toThrow('disk error');
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
