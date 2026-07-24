import sequelize, { connectDatabase } from '../config/database.js';
import { initializeModels } from '../core/database/models.js';
import PermissionService from '../modules/permissions/service/permission.service.js';
import RoleRepository from '../modules/roles/repository/role.repository.js';
import RoleService from '../modules/roles/service/role.service.js';
import UserRepository from '../modules/users/repository/user.repository.js';
import UserService from '../modules/users/service/user.service.js';

const roleNames = ['ADMIN', 'MANAGER', 'USER'];
const permissionNames = [
  'USER_READ',
  'USER_CREATE',
  'USER_UPDATE',
  'USER_DELETE',
  'categories.read',
  'categories.create',
  'categories.update',
  'categories.delete',
  'properties.read',
  'properties.create',
  'properties.update',
  'properties.delete',
  'materials.read',
  'materials.create',
  'materials.update',
  'materials.delete',
  'dashboard.read',
  'brands.read',
  'brands.create',
  'brands.update',
  'brands.delete',
  'maintenance.read',
  'maintenance.create',
  'maintenance.update',
  'maintenance.delete',
  'maintenance.execute',
];

/** Seeds required authorization data and the local development administrator. */
async function seed() {
  await connectDatabase();
  initializeModels();
  await sequelize.sync();
  const roleService = new RoleService();
  const roleRepository = new RoleRepository();
  const permissionService = new PermissionService();
  for (const name of roleNames)
    if (!(await roleRepository.findByName(name)))
      await roleService.create({ name, description: `${name} role` });
  for (const name of permissionNames)
    if (!(await permissionService.permissionRepository.findByName(name)))
      await permissionService.create({ name, description: `${name} permission` });
  const adminRole = await roleRepository.findByName('ADMIN');
  const permissions = await permissionService.getAll();
  await roleRepository.setPermissions(adminRole, permissions);
  const userRepository = new UserRepository();
  const userService = new UserService(userRepository, roleRepository);
  let admin = await userRepository.findByEmail('admin@greendesk.local');
  if (!admin)
    admin = await userService.create({
      firstName: 'GreenDesk',
      lastName: 'Administrator',
      email: 'admin@greendesk.local',
      password: 'ChangeMe123!',
    });
  await userRepository.setRoles(admin, [adminRole]);
  await sequelize.close();
}

seed().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
