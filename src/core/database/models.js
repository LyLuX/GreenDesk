import AuditLog from '../../modules/audit/model/audit-log.model.js';
import Permission from '../../modules/permissions/model/permission.model.js';
import Role from '../../modules/roles/model/role.model.js';
import User from '../../modules/users/model/user.model.js';
import Category from '../../modules/categories/model/category.model.js';
import Material from '../../modules/materials/model/material.model.js';
import MaterialFile from '../../modules/materials/model/material-file.model.js';
import PartManufacturer from '../../modules/manufacturers/model/part-manufacturer.model.js';
import MaintenanceTask from '../../modules/maintenance/model/maintenance-task.model.js';
import MaintenanceHistory from '../../modules/maintenance/model/maintenance-history.model.js';
import MaintenanceIntervention from '../../modules/maintenance/model/maintenance-intervention.model.js';
import MaintenanceOperation from '../../modules/maintenance/model/maintenance-operation.model.js';
import MaintenancePart from '../../modules/maintenance/model/maintenance-part.model.js';
import MaintenancePartPriceHistory from '../../modules/maintenance/model/maintenance-part-price-history.model.js';
import MaintenancePartUsage from '../../modules/maintenance/model/maintenance-part-usage.model.js';
import Supplier from '../../modules/suppliers/model/supplier.model.js';
import MaintenanceTaskPart from '../../modules/maintenance/model/maintenance-task-part.model.js';
import RevokedAccessToken from '../../modules/auth/model/revoked-access-token.model.js';
import EmailVerificationToken from '../../modules/auth/model/email-verification-token.model.js';
import StockMovement from '../inventory/stock-movement.model.js';

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
  User.hasMany(EmailVerificationToken, {
    foreignKey: 'userId',
    as: 'emailVerificationTokens',
    onDelete: 'CASCADE',
  });
  EmailVerificationToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
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
  Material.belongsTo(PartManufacturer, {
    foreignKey: 'manufacturerId',
    as: 'manufacturer',
    onDelete: 'SET NULL',
  });
  PartManufacturer.hasMany(Material, {
    foreignKey: 'manufacturerId',
    as: 'materials',
  });
  Material.belongsTo(Category, { foreignKey: 'category_id', as: 'category', onDelete: 'SET NULL' });
  Category.hasMany(Material, { foreignKey: 'category_id', as: 'materials' });
  Material.hasMany(MaterialFile, {
    foreignKey: 'material_id',
    as: 'files',
    onDelete: 'CASCADE',
  });
  MaterialFile.belongsTo(Material, {
    foreignKey: 'material_id',
    as: 'material',
    onDelete: 'CASCADE',
  });
  Material.hasMany(MaintenanceTask, {
    foreignKey: 'materialId',
    as: 'maintenanceTasks',
    onDelete: 'CASCADE',
  });
  MaintenanceTask.belongsTo(Material, {
    foreignKey: 'materialId',
    as: 'material',
    onDelete: 'CASCADE',
  });
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
  PartManufacturer.hasMany(MaintenancePart, {
    foreignKey: 'manufacturerId',
    as: 'parts',
  });
  MaintenancePart.belongsTo(PartManufacturer, {
    foreignKey: 'manufacturerId',
    as: 'manufacturerDirectory',
  });
  Supplier.hasMany(MaintenancePart, {
    foreignKey: 'supplierId',
    as: 'parts',
  });
  MaintenancePart.belongsTo(Supplier, {
    foreignKey: 'supplierId',
    as: 'supplierDirectory',
  });
  MaintenanceTask.hasMany(MaintenanceHistory, {
    foreignKey: 'maintenance_task_id',
    as: 'history',
    onDelete: 'CASCADE',
  });
  MaintenanceHistory.belongsTo(MaintenanceTask, {
    foreignKey: 'maintenance_task_id',
    as: 'task',
    onDelete: 'CASCADE',
  });
  MaintenanceHistory.belongsTo(User, { foreignKey: 'performed_by', as: 'performedByUser' });
  Material.hasMany(MaintenanceIntervention, {
    foreignKey: 'materialId',
    as: 'maintenanceInterventions',
  });
  MaintenanceIntervention.belongsTo(Material, {
    foreignKey: 'materialId',
    as: 'material',
  });
  MaintenanceIntervention.belongsTo(User, {
    foreignKey: 'performedBy',
    as: 'performedByUser',
  });
  MaintenanceIntervention.hasMany(MaintenancePartUsage, {
    foreignKey: 'maintenanceInterventionId',
    as: 'partUsages',
    onDelete: 'CASCADE',
  });
  MaintenancePartUsage.belongsTo(MaintenanceIntervention, {
    foreignKey: 'maintenanceInterventionId',
    as: 'intervention',
    onDelete: 'CASCADE',
  });
  MaintenanceHistory.hasMany(MaintenancePartUsage, {
    foreignKey: 'maintenanceHistoryId',
    as: 'partUsages',
    onDelete: 'CASCADE',
  });
  MaintenancePartUsage.belongsTo(MaintenanceHistory, {
    foreignKey: 'maintenanceHistoryId',
    as: 'history',
    onDelete: 'CASCADE',
  });
  MaintenancePart.hasMany(MaintenancePartUsage, {
    foreignKey: 'maintenancePartId',
    as: 'usageCosts',
  });
  MaintenancePartUsage.belongsTo(MaintenancePart, {
    foreignKey: 'maintenancePartId',
    as: 'part',
    onDelete: 'SET NULL',
  });
  MaintenancePart.hasMany(MaintenancePartPriceHistory, {
    foreignKey: 'maintenancePartId',
    as: 'priceHistory',
    onDelete: 'CASCADE',
  });
  MaintenancePartPriceHistory.belongsTo(MaintenancePart, {
    foreignKey: 'maintenancePartId',
    as: 'part',
    onDelete: 'CASCADE',
  });
  MaintenancePartPriceHistory.belongsTo(User, {
    foreignKey: 'changedBy',
    as: 'changedByUser',
  });
  StockMovement.belongsTo(User, { foreignKey: 'performedBy', as: 'performedByUser' });

  initialized = true;
}

export {
  AuditLog,
  Permission,
  Role,
  User,
  Category,
  Material,
  PartManufacturer,
  MaterialFile,
  MaintenanceTask,
  MaintenanceHistory,
  MaintenanceIntervention,
  MaintenanceOperation,
  MaintenancePart,
  MaintenancePartPriceHistory,
  MaintenancePartUsage,
  Supplier,
  MaintenanceTaskPart,
  RevokedAccessToken,
  EmailVerificationToken,
  StockMovement,
};
