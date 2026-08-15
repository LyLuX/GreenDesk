import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import User from '../src/modules/users/model/user.model.js';
import UserRepository from '../src/modules/users/repository/user.repository.js';

describe('UserRepository authorization versions', () => {
  afterEach(() => jest.restoreAllMocks());

  it('requires the JWT authorization version when checking an active user', async () => {
    const findOne = jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1 });
    const repository = new UserRepository();

    await expect(repository.isActiveByClaims(1, 'user-uuid', 4)).resolves.toBe(true);

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 1, uuid: 'user-uuid', isActive: true, authorizationVersion: 4 },
      attributes: ['id'],
    });
  });

  it('increments only users assigned to a role and excludes the acting administrator', async () => {
    const transaction = { id: 'transaction' };
    const findAll = jest.spyOn(User, 'findAll').mockResolvedValue([{ id: 2 }, { id: 3 }]);
    const increment = jest.spyOn(User, 'increment').mockResolvedValue(undefined);
    const repository = new UserRepository();

    await expect(
      repository.incrementAuthorizationVersionsForRole(7, {
        excludeUserId: 1,
        transaction,
      }),
    ).resolves.toBe(2);

    expect(findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: ['id'],
        where: { id: { [Op.ne]: 1 } },
        transaction,
        include: [
          expect.objectContaining({
            as: 'roles',
            where: { id: 7 },
            required: true,
          }),
        ],
      }),
    );
    expect(increment).toHaveBeenCalledWith('authorizationVersion', {
      where: { id: { [Op.in]: [2, 3] } },
      transaction,
    });
  });
});
