const ROLE_USER_READ_PREFIX = 'users.roles.';
const ROLE_USER_READ_SUFFIX = '.read';

export const roleUserReadPermissionName = (roleName) =>
  `${ROLE_USER_READ_PREFIX}${roleName}${ROLE_USER_READ_SUFFIX}`;

export const roleUserReadPermissionDescription = (roleName) =>
  `Consulter les utilisateurs rattachés au rôle « ${roleName} ».`;

export const roleNameFromUserReadPermission = (permissionName) => {
  if (
    typeof permissionName !== 'string' ||
    !permissionName.startsWith(ROLE_USER_READ_PREFIX) ||
    !permissionName.endsWith(ROLE_USER_READ_SUFFIX)
  ) {
    return null;
  }
  const roleName = permissionName.slice(
    ROLE_USER_READ_PREFIX.length,
    -ROLE_USER_READ_SUFFIX.length,
  );
  return roleName || null;
};

export const isRoleUserReadPermission = (permissionName) =>
  Boolean(roleNameFromUserReadPermission(permissionName));

export const readableRoleNames = (permissionNames = []) => [
  ...new Set(permissionNames.map(roleNameFromUserReadPermission).filter(Boolean)),
];
