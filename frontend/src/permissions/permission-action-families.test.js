import { describe, expect, it } from 'vitest';
import { getPermissionFamily, permissionActionFamilies } from './permission-action-families.js';

describe('permission action families', () => {
  it('groups every supported permission action into seven explicit families', () => {
    expect(permissionActionFamilies).toHaveLength(7);
    expect(
      Object.fromEntries(
        [
          'read',
          'create',
          'upload',
          'update',
          'set_primary',
          'adjust_on_hand',
          'adjust_on_order',
          'order',
          'receive',
          'consume',
          'execute',
          'skip_parts',
          'delete',
          'financial',
        ].map((action) => [action, getPermissionFamily(`resource.${action}`)]),
      ),
    ).toEqual({
      read: 'read',
      create: 'create',
      upload: 'create',
      update: 'update',
      set_primary: 'update',
      adjust_on_hand: 'stock',
      adjust_on_order: 'stock',
      order: 'stock',
      receive: 'stock',
      consume: 'stock',
      execute: 'execute',
      skip_parts: 'execute',
      delete: 'delete',
      financial: 'financial',
    });
  });

  it('does not assign unconfigured or invalid permission codes', () => {
    expect(getPermissionFamily('ADMIN')).toBeNull();
    expect(getPermissionFamily('resource.unknown')).toBeNull();
  });
});
