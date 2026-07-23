import AuditLog from '../../modules/audit/model/audit-log.model.js';
import Permission from '../../modules/permissions/model/permission.model.js';
import Role from '../../modules/roles/model/role.model.js';
import User from '../../modules/users/model/user.model.js';
import Category from '../../modules/categories/model/category.model.js';
import Property from '../../modules/properties/model/property.model.js';
import Material from '../../modules/materials/model/material.model.js';

let initialized = false;

/**
 * Registers relationships once before Sequelize synchronizes the schema.
 *
 * @returns {void}
 */
export function initializeModels() {
  if (initialized) {
    return;
  }

  User.belongsToMany(Role, {
    through: 'user_roles',
    foreignKey: 'user_id',
    otherKey: 'role_id',
    as: 'roles',
  });
  Role.belongsToMany(User, {
    through: 'user_roles',
    foreignKey: 'role_id',
    otherKey: 'user_id',
    as: 'users',
  });
  Role.belongsToMany(Permission, {
    through: 'role_permissions',
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions',
  });
  Permission.belongsToMany(Role, {
    through: 'role_permissions',
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles',
  });
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  initialized = true;
}

export { AuditLog, Permission, Role, User, Category, Property, Material };
