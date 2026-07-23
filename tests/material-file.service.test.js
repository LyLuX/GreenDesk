import { jest } from '@jest/globals';

import MaterialFileService from '../src/modules/materials/service/material-file.service.js';

describe('MaterialFileService', () => {
  const createService = () =>
    new MaterialFileService(
      { countPhotos: jest.fn(), create: jest.fn(), findByUuid: jest.fn() },
      { getEntityByUuid: jest.fn() },
    );

  it('rejects an upload without a file', async () => {
    await expect(createService().add('uuid', undefined, 'photo')).rejects.toMatchObject({
      statusCode: 400,
      message: 'A file is required',
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
    ).rejects.toMatchObject({ statusCode: 400, message: 'A valid document type is required' });
  });
});
