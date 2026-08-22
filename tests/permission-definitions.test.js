import permissionDefinitions from '../src/core/constants/permission-definitions.js';

describe('permission definitions', () => {
  it('provides a unique and meaningful description for every application permission', () => {
    const names = permissionDefinitions.map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(41);
    expect(names).toEqual(
      expect.arrayContaining([
        'maintenance.operations.read',
        'maintenance.operations.create',
        'maintenance.operations.update',
        'maintenance.operations.delete',
        'maintenance.parts.read',
        'maintenance.parts.create',
        'maintenance.parts.update',
        'maintenance.parts.delete',
        'maintenance.parts.stock.adjust_on_hand',
        'maintenance.parts.stock.adjust_on_order',
        'maintenance.parts.stock.order',
        'maintenance.parts.stock.receive',
        'maintenance.parts.stock.consume',
        'maintenance.parts.price.update',
        'maintenance.execute.skip_parts',
      ]),
    );
    for (const { name, description } of permissionDefinitions) {
      expect(description).not.toContain(name);
      expect(description.length).toBeGreaterThan(25);
      expect(description).toMatch(/[.!]$/);
    }
  });
});
