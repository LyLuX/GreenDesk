import { describe, expect, it } from '@jest/globals';

import {
  isRoleUserReadPermission,
  readableRoleNames,
  roleNameFromUserReadPermission,
  roleUserReadPermissionName,
} from '../src/core/constants/user-visibility-permissions.js';

describe('role-based user visibility permission names', () => {
  it('uses the exact readable role name instead of its UUID', () => {
    expect(roleUserReadPermissionName('TECHNICIEN')).toBe('users.roles.TECHNICIEN.read');
    expect(roleUserReadPermissionName('CHEF D’ÉQUIPE')).toBe('users.roles.CHEF D’ÉQUIPE.read');
  });

  it('extracts and deduplicates readable role names from granted permissions', () => {
    expect(
      readableRoleNames([
        'users.read',
        'users.roles.USER.read',
        'users.roles.MANAGER.read',
        'users.roles.USER.read',
      ]),
    ).toEqual(['USER', 'MANAGER']);
  });

  it('recognizes only complete managed role permissions', () => {
    expect(roleNameFromUserReadPermission('users.roles.ADMIN.read')).toBe('ADMIN');
    expect(isRoleUserReadPermission('users.roles.ADMIN.read')).toBe(true);
    expect(isRoleUserReadPermission('users.roles..read')).toBe(false);
    expect(isRoleUserReadPermission('users.roles.ADMIN.update')).toBe(false);
  });
});
