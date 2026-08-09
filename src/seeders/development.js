import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import sequelize, { connectDatabase } from '../config/database.js';
import env from '../config/env.js';
import permissionDefinitions from '../core/constants/permission-definitions.js';
import { initializeModels } from '../core/database/models.js';
import { withTransaction } from '../core/database/transaction-context.js';
import PermissionService from '../modules/permissions/service/permission.service.js';
import RoleRepository from '../modules/roles/repository/role.repository.js';
import RoleService from '../modules/roles/service/role.service.js';
import UserRepository from '../modules/users/repository/user.repository.js';
import UserService from '../modules/users/service/user.service.js';

const roleNames = ['ADMIN', 'MANAGER', 'USER'];
const localDatabaseHosts = new Set(['127.0.0.1', 'localhost', '::1']);
const confirmationArgument = '--confirm-local-development';

/** Refuses to seed any environment that is not explicitly local development. */
export function assertDevelopmentSeedAllowed(runtimeEnv = env, argv = process.argv.slice(2)) {
  if (runtimeEnv.nodeEnv !== 'development') {
    throw new Error('Le seeder local est strictement réservé à NODE_ENV=development.');
  }
  if (!localDatabaseHosts.has(runtimeEnv.database.host.toLowerCase())) {
    throw new Error('Le seeder local exige une base sur localhost, 127.0.0.1 ou ::1.');
  }
  if (!argv.includes(confirmationArgument)) {
    throw new Error(
      `Confirmez la base locale avec l’argument ${confirmationArgument} après avoir appliqué les migrations.`,
    );
  }
}

/** Resolves a one-time local administrator credential without any repository default password. */
export function createDevelopmentAdminCredentials(
  source = process.env,
  randomBytesFactory = randomBytes,
) {
  const email = (source.GREENDESK_SEED_ADMIN_EMAIL ?? 'admin@greendesk.local').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('GREENDESK_SEED_ADMIN_EMAIL doit être une adresse email valide.');
  }

  const suppliedPassword = source.GREENDESK_SEED_ADMIN_PASSWORD?.trim();
  if (suppliedPassword && Buffer.byteLength(suppliedPassword, 'utf8') < 16) {
    throw new Error('GREENDESK_SEED_ADMIN_PASSWORD doit contenir au moins 16 octets.');
  }

  return {
    email,
    password: suppliedPassword || randomBytesFactory(24).toString('base64url'),
    generatedPassword: !suppliedPassword,
  };
}

/** Seeds authorization reference data and creates or rotates the local administrator. */
export async function seedDevelopmentData(credentials, dependencies = {}) {
  const roleService = dependencies.roleService ?? new RoleService();
  const roleRepository = dependencies.roleRepository ?? new RoleRepository();
  const permissionService = dependencies.permissionService ?? new PermissionService();
  const userRepository = dependencies.userRepository ?? new UserRepository();
  const userService = dependencies.userService ?? new UserService(userRepository, roleRepository);

  for (const name of roleNames) {
    if (!(await roleRepository.findByName(name))) {
      await roleService.create({ name, description: `${name} role` });
    }
  }
  for (const definition of permissionDefinitions) {
    const permission = await permissionService.permissionRepository.findByName(definition.name);
    if (permission) {
      if (permission.description !== definition.description) {
        await permissionService.update(permission.uuid, { description: definition.description });
      }
    } else {
      await permissionService.create(definition);
    }
  }

  const adminRole = await roleRepository.findByName('ADMIN');
  const permissions = await permissionService.getAll();
  await roleRepository.setPermissions(adminRole, permissions);

  const existingAdmin = await userRepository.findByEmail(credentials.email, { withDeleted: true });
  const adminValues = {
    firstName: 'GreenDesk',
    lastName: 'Administrator',
    email: credentials.email,
    password: credentials.password,
    isActive: true,
  };
  const admin =
    existingAdmin && !existingAdmin.deletedAt
      ? await userService.update(existingAdmin.uuid, adminValues)
      : await userService.create(adminValues);
  await userRepository.setRoles(admin, [adminRole]);
}

/** Runs the local seed only after migrations and explicit safety checks. */
export async function seed() {
  assertDevelopmentSeedAllowed();
  const credentials = createDevelopmentAdminCredentials();

  try {
    await connectDatabase();
    initializeModels();
    await withTransaction(() => seedDevelopmentData(credentials));
  } finally {
    await sequelize.close();
  }

  process.stdout.write(`Administrateur local prêt : ${credentials.email}\n`);
  if (credentials.generatedPassword) {
    process.stdout.write(
      `Mot de passe local généré (affiché une seule fois) : ${credentials.password}\n`,
    );
  } else {
    process.stdout.write(
      'Le mot de passe fourni à l’exécution a été appliqué sans être affiché.\n',
    );
  }
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  seed().catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  });
}
