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
    expect(pageQuery.order).toEqual([
      ['lastLoginAt', 'DESC'],
      ['id', 'DESC'],
    ]);
    expect(rowQuery.paranoid).toBe(false);
    expect(rowQuery.where.deletedAt[Op.ne]).toBeNull();
    expect(rowQuery.order).toEqual(pageQuery.order);
    expect(result).toEqual({ count: 1, rows: [{ id: 9 }] });
  });

  it('keeps ordinary user lists paranoid by default', async () => {
    jest.spyOn(User, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
    jest.spyOn(User, 'findAll').mockResolvedValue([]);

    await new UserRepository().findAll();

    expect(User.findAndCountAll.mock.calls[0][0].paranoid).toBe(true);
    expect(User.findAndCountAll.mock.calls[0][0].where).not.toHaveProperty('deletedAt');
    expect(User.findAndCountAll.mock.calls[0][0].order[0]).toEqual(['lastLoginAt', 'DESC']);
  });

  it('can resolve a user by UUID through the paranoid boundary for restoration', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({ id: 9 });

    await new UserRepository().findByUuid('user-uuid', { withDeleted: true });

    expect(User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { uuid: 'user-uuid' }, paranoid: false }),
    );
  });

  it('loads authentication companies without the removed company code', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    jest.spyOn(User, 'scope').mockReturnValue({ findOne });

    await new UserRepository().findByEmailWithPassword('user@example.test');

    const companyInclude = findOne.mock.calls[0][0].include.find(({ as }) => as === 'companies');
    expect(companyInclude.attributes).toEqual(['id', 'uuid', 'name', 'active']);
  });
});
