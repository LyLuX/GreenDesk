/** Canonical maintenance permission codes used by routes, navigation, and actions. */
const maintenancePermissions = Object.freeze({
  sheets: Object.freeze({
    read: 'maintenance.sheets.read',
  }),
  plans: Object.freeze({
    read: 'maintenance.read',
    create: 'maintenance.create',
    update: 'maintenance.update',
    delete: 'maintenance.delete',
    status: Object.freeze({ update: 'maintenance.status.update' }),
    execute: 'maintenance.execute',
    executeWithoutPartReplacement: 'maintenance.execute.skip_parts',
  }),
  operations: Object.freeze({
    read: 'maintenance.operations.read',
    create: 'maintenance.operations.create',
    update: 'maintenance.operations.update',
    delete: 'maintenance.operations.delete',
    status: Object.freeze({ update: 'maintenance.operations.status.update' }),
  }),
  parts: Object.freeze({
    read: 'maintenance.parts.read',
    create: 'maintenance.parts.create',
    update: 'maintenance.parts.update',
    delete: 'maintenance.parts.delete',
    status: Object.freeze({ update: 'maintenance.parts.status.update' }),
    stock: Object.freeze({
      adjustOnHand: 'maintenance.parts.stock.adjust_on_hand',
      adjustOnOrder: 'maintenance.parts.stock.adjust_on_order',
      minimumUpdate: 'maintenance.parts.stock.minimum.update',
      order: 'maintenance.parts.stock.order',
      receive: 'maintenance.parts.stock.receive',
      consume: 'maintenance.parts.stock.consume',
    }),
    price: Object.freeze({
      update: 'maintenance.parts.price.update',
    }),
  }),
});

export default maintenancePermissions;
