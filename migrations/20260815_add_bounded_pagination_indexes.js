'use strict';

const indexes = [
  {
    table: 'audit_logs',
    fields: ['entity', 'entity_uuid', 'created_at', 'id'],
    name: 'idx_audit_entity_created',
  },
  {
    table: 'maintenance_history',
    fields: ['maintenance_task_id', 'performed_at', 'id'],
    name: 'idx_maintenance_history_task_performed',
  },
  {
    table: 'maintenance_tasks',
    fields: ['material_id', 'active', 'next_maintenance_date', 'id'],
    name: 'idx_maintenance_material_active_date',
  },
  {
    table: 'materials',
    fields: ['active', 'name', 'id'],
    name: 'idx_materials_active_name',
  },
  {
    table: 'users',
    fields: ['is_active', 'last_name', 'first_name', 'id'],
    name: 'idx_users_active_name',
  },
];

module.exports = {
  async up(queryInterface) {
    for (const index of indexes) {
      await queryInterface.addIndex(index.table, index.fields, { name: index.name });
    }
  },

  async down(queryInterface) {
    for (const index of [...indexes].reverse()) {
      await queryInterface.removeIndex(index.table, index.name);
    }
  },
};
