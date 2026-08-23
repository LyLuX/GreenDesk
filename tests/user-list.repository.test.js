import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import User from '../src/modules/users/model/user.model.js';
import UserRepository from '../src/modules/users/repository/user.repository.js';

describe('UserRepository deleted-user listing', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses explicit non-paranoid queries restricted to deleted records', async () => {
    jest.spyOn(User, 'findAndCountAll').mockResolvedValue({ count: 1, rows: [{ id: 9 }] });
    jest.spyOn(User, 'findAll').mockResolvedValue([{ id: 9 }]);

    const result = await new UserRepository().findAll({ deleted: true });

    const pageQuery = User.findAndCountAll.mock.calls[0][0];
    const rowQuery = User.findAll.mock.calls[0][0];
    expect(pageQuery.paranoid).toBe(false);
    expect(pageQuery.where.deletedAt[Op.ne]).toBeNull();
    expect(rowQuery.paranoid).toBe(false);
    expect(rowQuery.where.deletedAt[Op.ne]).toBeNull();
    expect(result).toEqual({ count: 1, rows: [{ id: 9 }] });
  });

  it('keeps ordinary user lists paranoid by default', async () => {
    jest.spyOn(User, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
    jest.spyOn(User, 'findAll').mockResolvedValue([]);

    await new UserRepository().findAll();

    expect(User.findAndCountAll.mock.calls[0][0].paranoid).toBe(true);
    expect(User.findAndCountAll.mock.calls[0][0].where).not.toHaveProperty('deletedAt');
  });
});
