import permissionDefinitions from '../src/core/constants/permission-definitions.js';

describe('permission definitions', () => {
  it('provides a unique and meaningful description for every application permission', () => {
    const names = permissionDefinitions.map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(22);
    for (const { name, description } of permissionDefinitions) {
      expect(description).not.toContain(name);
      expect(description.length).toBeGreaterThan(25);
      expect(description).toMatch(/[.!]$/);
    }
  });
});
