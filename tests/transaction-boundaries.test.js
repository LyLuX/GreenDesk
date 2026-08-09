import request from 'supertest';
import { jest } from '@jest/globals';

import app from '../src/app.js';
import sequelize from '../src/config/database.js';
import CategoryService from '../src/modules/categories/service/category.service.js';

const transaction = { id: 'service-unit-of-work' };

describe('service transaction boundaries', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not open transactions for concurrent API reads', async () => {
    const createTransaction = jest.spyOn(sequelize, 'transaction');

    const responses = await Promise.all(
      Array.from({ length: 20 }, () => request(app).get('/api/v1')),
    );

    expect(responses.every(({ status }) => status === 200)).toBe(true);
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('rolls back a business write when its audit fails', async () => {
    const persistedCategories = [];
    const repository = {
      withTransaction: jest.fn(async (callback) => {
        const snapshot = [...persistedCategories];
        try {
          return await callback(transaction);
        } catch (error) {
          persistedCategories.splice(0, persistedCategories.length, ...snapshot);
          throw error;
        }
      }),
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn(async (values, options) => {
        expect(options).toEqual({ transaction });
        const category = {
          ...values,
          uuid: 'd0fd8cdc-74d0-4f58-af27-6c181e05895d',
          toJSON: () => values,
        };
        persistedCategories.push(category);
        return category;
      }),
    };
    const auditService = {
      record: jest.fn(async (_event, options) => {
        expect(options).toEqual({ transaction });
        throw new Error('Audit unavailable');
      }),
    };
    const service = new CategoryService(repository, auditService);

    await expect(service.create({ name: 'Espaces verts' }, 1)).rejects.toThrow('Audit unavailable');

    expect(repository.withTransaction).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledTimes(1);
    expect(persistedCategories).toEqual([]);
  });
});
