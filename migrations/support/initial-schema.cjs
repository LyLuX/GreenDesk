'use strict';

const adoptionColumns = {
  users: ['id', 'uuid', 'email', 'password_hash'],
  roles: ['id', 'uuid', 'name'],
  permissions: ['id', 'uuid', 'name'],
  user_roles: ['user_id', 'role_id'],
  role_permissions: ['role_id', 'permission_id'],
  categories: ['id', 'uuid', 'name'],
  materials: ['id', 'uuid', 'name'],
  material_files: ['id', 'uuid', 'material_id'],
  maintenance_tasks: ['id', 'uuid', 'material_id'],
  maintenance_history: ['id', 'uuid', 'maintenance_task_id'],
  audit_logs: ['id', 'uuid', 'entity'],
};

function definitions(S) {
  const id = () => ({
    type: S.BIGINT.UNSIGNED,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  });
  const uuid = () => ({ type: S.UUID, allowNull: false, unique: true });
  const text = (length, allowNull = true) => ({ type: S.STRING(length), allowNull });
  const integer = () => ({ type: S.BIGINT.UNSIGNED, allowNull: true });
  const date = (allowNull = true) => ({ type: S.DATE, allowNull });
  const active = () => ({ type: S.BOOLEAN, allowNull: false, defaultValue: true });
  const timestamps = (updated = true) => ({
    created_at: date(false),
    ...(updated ? { updated_at: date(false) } : {}),
    deleted_at: date(),
  });
  const entity = (updated = true) => ({ id: id(), uuid: uuid(), ...timestamps(updated) });
  const reference = (table, allowNull = false, onDelete = 'CASCADE') => ({
    type: S.BIGINT.UNSIGNED,
    allowNull,
    references: { model: table, key: 'id' },
    onDelete,
    onUpdate: 'CASCADE',
  });
  const directory = () => ({
    ...entity(),
    name: { ...text(150, false), unique: true },
    active: active(),
    created_by: integer(),
    updated_by: integer(),
  });
  const join = (leftName, leftTable, rightName, rightTable) => ({
    [leftName]: { ...reference(leftTable), primaryKey: true },
    [rightName]: { ...reference(rightTable), primaryKey: true },
    created_at: date(false),
    updated_at: date(false),
  });
  return {
    users: {
      ...entity(),
      first_name: text(100, false),
      last_name: text(100, false),
      email: { ...text(255, false), unique: true },
      password_hash: text(255, false),
      is_active: active(),
      last_login_at: date(),
    },
    roles: { ...entity(), name: { ...text(100, false), unique: true }, description: text(500) },
    permissions: {
      ...entity(),
      name: { ...text(100, false), unique: true },
      description: text(500),
    },
    user_roles: join('user_id', 'users', 'role_id', 'roles'),
    role_permissions: join('role_id', 'roles', 'permission_id', 'permissions'),
    brands: directory(),
    categories: { ...directory(), description: { type: S.TEXT, allowNull: true } },
    materials: {
      ...directory(),
      description: { type: S.TEXT, allowNull: true },
      unit: text(50, false),
      purchase_price: { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      brand_id: reference('brands', true, 'SET NULL'),
      category_id: reference('categories', true, 'SET NULL'),
      model: text(150),
      serial_number: { ...text(150), unique: true },
      purchase_date: { type: S.DATEONLY, allowNull: true },
      commissioned_at: { type: S.DATEONLY, allowNull: true },
      retired_at: { type: S.DATEONLY, allowNull: true },
      engine_hours: { type: S.DECIMAL(10, 2), allowNull: true },
      notes: { type: S.TEXT, allowNull: true },
    },
    material_files: {
      ...entity(false),
      material_id: reference('materials'),
      kind: { type: S.ENUM('photo', 'document'), allowNull: false },
      document_type: { type: S.ENUM('invoice', 'manual', 'certificate', 'other'), allowNull: true },
      original_name: text(255, false),
      file_name: text(255, false),
      mime_type: text(100, false),
      size: { type: S.INTEGER.UNSIGNED, allowNull: false },
      is_primary: { type: S.BOOLEAN, defaultValue: false },
    },
    maintenance_tasks: {
      ...entity(),
      material_id: reference('materials'),
      title: text(150, false),
      description: { type: S.TEXT, allowNull: true },
      maintenance_type: {
        type: S.ENUM(
          'preventive',
          'inspection',
          'replacement',
          'lubrication',
          'cleaning',
          'custom',
        ),
        allowNull: false,
      },
      interval_hours: { type: S.DECIMAL(10, 2), allowNull: true },
      interval_days: { type: S.INTEGER.UNSIGNED, allowNull: true },
      last_maintenance_date: { type: S.DATEONLY, allowNull: true },
      next_maintenance_date: { type: S.DATEONLY, allowNull: true },
      last_engine_hours: { type: S.DECIMAL(10, 2), allowNull: true },
      next_engine_hours: { type: S.DECIMAL(10, 2), allowNull: true },
      priority: {
        type: S.ENUM('low', 'normal', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'normal',
      },
      active: active(),
      notes: { type: S.TEXT, allowNull: true },
      created_by: integer(),
      updated_by: integer(),
    },
    maintenance_history: {
      ...entity(false),
      maintenance_task_id: reference('maintenance_tasks'),
      performed_at: { type: S.DATEONLY, allowNull: false },
      engine_hours: { type: S.DECIMAL(10, 2), allowNull: true },
      comment: { type: S.TEXT, allowNull: true },
      performed_by: reference('users', true, 'SET NULL'),
    },
    audit_logs: {
      ...entity(false),
      user_id: reference('users', true, 'SET NULL'),
      action: text(100, false),
      entity: text(100, false),
      entity_uuid: { type: S.UUID, allowNull: true },
      old_values: { type: S.JSON, allowNull: true },
      new_values: { type: S.JSON, allowNull: true },
    },
  };
}

module.exports = { definitions, adoptionColumns };
