import { jest } from '@jest/globals';

import MaterialFileService from '../src/modules/materials/service/material-file.service.js';

describe('MaterialFileService', () => {
  const createService = (overrides = {}, materialService = { getEntityByUuid: jest.fn() }) =>
    new MaterialFileService(
      {
        countPhotos: jest.fn(),
        create: jest.fn(),
        findByUuid: jest.fn(),
        remove: jest.fn(),
        ...overrides,
      },
      materialService,
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
        'unknown',
      ),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Le type de document est invalide.' });
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
    expect(repository.remove).toHaveBeenCalledWith(file);
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
