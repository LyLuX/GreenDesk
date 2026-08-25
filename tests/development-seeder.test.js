import { readFileSync } from 'node:fs';
import { jest } from '@jest/globals';

import permissionDefinitions from '../src/core/constants/permission-definitions.js';
import {
  assertDevelopmentSeedAllowed,
  createDevelopmentAdminCredentials,
  seedDevelopmentData,
} from '../src/seeders/development.js';

const localDevelopmentEnvironment = {
  nodeEnv: 'development',
  database: { host: '127.0.0.1' },
};

describe('local development seeder safety', () => {
  it('allows only a confirmed local development database', () => {
    expect(() =>
      assertDevelopmentSeedAllowed(localDevelopmentEnvironment, ['--confirm-local-development']),
    ).not.toThrow();
  });

  it('rejects every non-development environment before connecting', () => {
    expect(() =>
      assertDevelopmentSeedAllowed({ nodeEnv: 'production', database: { host: '127.0.0.1' } }, [
        '--confirm-local-development',
      ]),
    ).toThrow(/strictement réservé à NODE_ENV=development/);
  });

  it('rejects a non-local database host', () => {
    expect(() =>
      assertDevelopmentSeedAllowed(
        { nodeEnv: 'development', database: { host: 'database.internal' } },
        ['--confirm-local-development'],
      ),
    ).toThrow(/exige une base sur localhost/);
  });

  it('requires an explicit command-line confirmation', () => {
    expect(() => assertDevelopmentSeedAllowed(localDevelopmentEnvironment, [])).toThrow(
      /--confirm-local-development/,
    );
  });

  it('generates a strong one-time password when none is supplied', () => {
    const credentials = createDevelopmentAdminCredentials({}, () =>
      Buffer.from('123456789012345678901234'),
    );

    expect(credentials).toEqual({
      email: 'admin@greendesk.local',
      password: Buffer.from('123456789012345678901234').toString('base64url'),
      generatedPassword: true,
    });
  });

  it('accepts a strong execution-time password without exposing a fixed default', () => {
    expect(
      createDevelopmentAdminCredentials({
        GREENDESK_SEED_ADMIN_EMAIL: 'LOCAL.ADMIN@GREENDESK.LOCAL',
        GREENDESK_SEED_ADMIN_PASSWORD: 'local-only-password-with-32-bytes',
      }),
    ).toEqual({
      email: 'local.admin@greendesk.local',
      password: 'local-only-password-with-32-bytes',
      generatedPassword: false,
    });
  });

  it('rejects invalid emails and short execution-time passwords', () => {
    expect(() =>
      createDevelopmentAdminCredentials({ GREENDESK_SEED_ADMIN_EMAIL: 'invalid' }),
    ).toThrow(/adresse email valide/);
    expect(() =>
      createDevelopmentAdminCredentials({ GREENDESK_SEED_ADMIN_PASSWORD: 'too-short' }),
    ).toThrow(/au moins 16 octets/);
  });

  it.each([
    { existingAdmin: { uuid: 'existing-admin', deletedAt: null }, operation: 'update' },
    { existingAdmin: null, operation: 'create' },
  ])(
    'creates or rotates the local administrator ($operation)',
    async ({ existingAdmin, operation }) => {
      const admin = { uuid: `${operation}-admin` };
      const adminRole = { uuid: 'admin-role', name: 'ADMIN' };
      const roleRepository = {
        findByName: jest.fn().mockResolvedValue(adminRole),
        setPermissions: jest.fn().mockResolvedValue(undefined),
      };
      const permissionService = {
        permissionRepository: {
          findByName: jest.fn().mockImplementation((name) =>
            Promise.resolve(
              name === 'users.roles.ADMIN.read'
                ? { uuid: `${name}-uuid`, name, description: 'Permission automatique' }
                : {
                    uuid: `${name}-uuid`,
                    name,
                    description: permissionDefinitions.find((item) => item.name === name)
                      .description,
                  },
            ),
          ),
        },
        update: jest.fn(),
        create: jest.fn(),
      };
      const userRepository = {
        findByEmail: jest.fn().mockResolvedValue(existingAdmin),
        setRoles: jest.fn().mockResolvedValue(undefined),
      };
      const userService = {
        update: jest.fn().mockResolvedValue(admin),
        create: jest.fn().mockResolvedValue(admin),
      };
      const credentials = {
        email: 'admin@greendesk.local',
        password: 'unique-local-password',
      };

      await seedDevelopmentData(credentials, {
        roleService: { create: jest.fn() },
        roleRepository,
        permissionService,
        userRepository,
        userService,
      });

      const expectedValues = expect.objectContaining({
        email: credentials.email,
        password: credentials.password,
        isActive: true,
      });
      if (operation === 'update') {
        expect(userService.update).toHaveBeenCalledWith(existingAdmin.uuid, expectedValues);
        expect(userService.create).not.toHaveBeenCalled();
      } else {
        expect(userService.create).toHaveBeenCalledWith(expectedValues);
        expect(userService.update).not.toHaveBeenCalled();
      }
      expect(userRepository.setRoles).toHaveBeenCalledWith(admin, [adminRole]);
      expect(roleRepository.setPermissions).toHaveBeenCalledWith(
        adminRole,
        expect.arrayContaining([
          expect.objectContaining({ name: 'users.all.read' }),
          expect.objectContaining({ name: 'users.roles.ADMIN.read' }),
        ]),
      );
    },
  );

  it('does not contain the retired fixed development password or schema sync', () => {
    const source = readFileSync(new URL('../src/seeders/development.js', import.meta.url), 'utf8');

    expect(source).not.toContain('ChangeMe123!');
    expect(source).not.toContain('sequelize.sync');
  });
});
