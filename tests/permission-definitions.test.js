import permissionDefinitions from '../src/core/constants/permission-definitions.js';

describe('permission definitions', () => {
  it('provides a unique and meaningful description for every application permission', () => {
    const names = permissionDefinitions.map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(71);
    expect(names).toEqual(
      expect.arrayContaining([
        'maintenance.operations.read',
        'maintenance.operations.create',
        'maintenance.operations.update',
        'maintenance.operations.delete',
        'maintenance.operations.status.update',
        'maintenance.parts.read',
        'maintenance.parts.create',
        'maintenance.parts.update',
        'maintenance.parts.delete',
        'maintenance.parts.status.update',
        'maintenance.parts.stock.adjust_on_hand',
        'maintenance.parts.stock.adjust_on_order',
        'maintenance.parts.stock.order',
        'maintenance.parts.stock.receive',
        'maintenance.parts.stock.consume',
        'maintenance.parts.price.update',
        'maintenance.execute.skip_parts',
        'history.fleet.read',
        'history.maintenance.read',
        'history.administration.read',
        'dashboard.read.financial',
        'users.read',
        'users.status.update',
        'users.password.update',
        'users.roles.update',
        'users.email_verification.resend',
        'roles.permissions.update',
        'permissions.delete',
        'categories.status.update',
        'materials.status.update',
        'materials.photos.create',
        'materials.photos.set_primary',
        'materials.documents.create',
        'materials.files.delete',
        'manufacturers.status.update',
        'manufacturers.logo.upload',
        'manufacturers.logo.delete',
        'suppliers.status.update',
        'maintenance.status.update',
      ]),
    );
    for (const { name, description } of permissionDefinitions) {
      expect(description).not.toContain(name);
      expect(description.length).toBeGreaterThan(25);
      expect(description).toMatch(/[.!]$/);
    }
  });
});
