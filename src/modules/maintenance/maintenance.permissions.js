/** Canonical maintenance permission codes shared by routes and permission definitions. */
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
    stock: Object.freeze({
      adjustOnHand: 'maintenance.parts.stock.adjust_on_hand',
      adjustOnOrder: 'maintenance.parts.stock.adjust_on_order',
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
