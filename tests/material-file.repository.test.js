import { jest } from '@jest/globals';

import sequelize from '../src/config/database.js';
import MaterialFile from '../src/modules/materials/model/material-file.model.js';
import MaterialFileRepository from '../src/modules/materials/repository/material-file.repository.js';

describe('MaterialFileRepository.setPrimary', () => {
  afterEach(() => jest.restoreAllMocks());

  it('updates every photo in the same transaction', async () => {
    const transaction = {};
    const file = { materialId: 8, update: jest.fn().mockResolvedValue({ uuid: 'photo' }) };
    jest
      .spyOn(sequelize, 'transaction')
      .mockImplementation(async (callback) => callback(transaction));
    jest.spyOn(MaterialFile, 'update').mockResolvedValue([1]);

    await expect(new MaterialFileRepository().setPrimary(file)).resolves.toEqual({ uuid: 'photo' });
    expect(MaterialFile.update).toHaveBeenCalledWith(
      { isPrimary: false },
      { where: { materialId: 8, kind: 'photo' }, transaction },
    );
    expect(file.update).toHaveBeenCalledWith({ isPrimary: true }, { transaction });
  });

  it('propagates an error so Sequelize rolls the transaction back', async () => {
    const transaction = {};
    const file = { materialId: 8, update: jest.fn().mockRejectedValue(new Error('update failed')) };
    const callbackTransaction = jest
      .spyOn(sequelize, 'transaction')
      .mockImplementation(async (callback) => callback(transaction));
    jest.spyOn(MaterialFile, 'update').mockResolvedValue([1]);

    await expect(new MaterialFileRepository().setPrimary(file)).rejects.toThrow('update failed');
    expect(callbackTransaction).toHaveBeenCalled();
  });
});
