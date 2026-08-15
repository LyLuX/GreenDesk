/** Canonical maintenance permission codes used by routes, navigation, and actions. */
const maintenancePermissions = Object.freeze({
  plans: Object.freeze({
    read: 'maintenance.read',
    create: 'maintenance.create',
    update: 'maintenance.update',
    delete: 'maintenance.delete',
    execute: 'maintenance.execute',
    executeWithoutPartReplacement: 'maintenance.execute.skip_parts',
  }),
  operations: Object.freeze({
    read: 'maintenance.operations.read',
    create: 'maintenance.operations.create',
    update: 'maintenance.operations.update',
    delete: 'maintenance.operations.delete',
  }),
  parts: Object.freeze({
    read: 'maintenance.parts.read',
    create: 'maintenance.parts.create',
    update: 'maintenance.parts.update',
    delete: 'maintenance.parts.delete',
  }),
});

export default maintenancePermissions;
