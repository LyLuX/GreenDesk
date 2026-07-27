import AuditLog from '../../modules/audit/model/audit-log.model.js';
import Permission from '../../modules/permissions/model/permission.model.js';
import Role from '../../modules/roles/model/role.model.js';
import User from '../../modules/users/model/user.model.js';
import Category from '../../modules/categories/model/category.model.js';
import Material from '../../modules/materials/model/material.model.js';
import MaterialFile from '../../modules/materials/model/material-file.model.js';
import Brand from '../../modules/brands/model/brand.model.js';
import MaintenanceTask from '../../modules/maintenance/model/maintenance-task.model.js';
import MaintenanceHistory from '../../modules/maintenance/model/maintenance-history.model.js';
import MaintenanceOperation from '../../modules/maintenance/model/maintenance-operation.model.js';
import MaintenancePart from '../../modules/maintenance/model/maintenance-part.model.js';
import MaintenancePartManufacturer from '../../modules/maintenance/model/maintenance-part-manufacturer.model.js';
import MaintenanceSupplier from '../../modules/maintenance/model/maintenance-supplier.model.js';
import MaintenanceTaskPart from '../../modules/maintenance/model/maintenance-task-part.model.js';
import RevokedAccessToken from '../../modules/auth/model/revoked-access-token.model.js';

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
  Material.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand', onDelete: 'SET NULL' });
  Material.belongsTo(Category, { foreignKey: 'category_id', as: 'category', onDelete: 'SET NULL' });
  Material.hasMany(MaterialFile, { foreignKey: 'material_id', as: 'files' });
  MaterialFile.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
  Material.hasMany(MaintenanceTask, { foreignKey: 'materialId', as: 'maintenanceTasks' });
  MaintenanceTask.belongsTo(Material, { foreignKey: 'materialId', as: 'material' });
  MaintenanceOperation.hasMany(MaintenanceTask, {
    foreignKey: 'operationId',
    as: 'maintenanceTasks',
  });
  MaintenanceTask.belongsTo(MaintenanceOperation, {
    foreignKey: 'operationId',
    as: 'operation',
  });
  MaintenanceTask.belongsToMany(MaintenancePart, {
    through: MaintenanceTaskPart,
    foreignKey: 'maintenanceTaskId',
    otherKey: 'maintenancePartId',
    as: 'parts',
  });
  MaintenancePart.belongsToMany(MaintenanceTask, {
    through: MaintenanceTaskPart,
    foreignKey: 'maintenancePartId',
    otherKey: 'maintenanceTaskId',
    as: 'maintenanceTasks',
  });
  MaintenancePartManufacturer.hasMany(MaintenancePart, {
    foreignKey: 'manufacturerId',
    as: 'parts',
  });
  MaintenancePart.belongsTo(MaintenancePartManufacturer, {
    foreignKey: 'manufacturerId',
    as: 'manufacturerDirectory',
  });
  MaintenanceSupplier.hasMany(MaintenancePart, {
    foreignKey: 'supplierId',
    as: 'parts',
  });
  MaintenancePart.belongsTo(MaintenanceSupplier, {
    foreignKey: 'supplierId',
    as: 'supplierDirectory',
  });
  MaintenanceTask.hasMany(MaintenanceHistory, { foreignKey: 'maintenance_task_id', as: 'history' });
  MaintenanceHistory.belongsTo(MaintenanceTask, { foreignKey: 'maintenance_task_id', as: 'task' });
  MaintenanceHistory.belongsTo(User, { foreignKey: 'performed_by', as: 'performedByUser' });

  initialized = true;
}

export {
  AuditLog,
  Permission,
  Role,
  User,
  Category,
  Material,
  Brand,
  MaterialFile,
  MaintenanceTask,
  MaintenanceHistory,
  MaintenanceOperation,
  MaintenancePart,
  MaintenancePartManufacturer,
  MaintenanceSupplier,
  MaintenanceTaskPart,
  RevokedAccessToken,
};
