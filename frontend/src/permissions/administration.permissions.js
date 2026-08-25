const administrationPermissions = Object.freeze({
  users: Object.freeze({
    read: 'users.read',
    all: Object.freeze({ read: 'users.all.read' }),
    create: 'users.create',
    update: 'users.update',
    delete: 'users.delete',
    restore: 'users.restore',
    deleted: Object.freeze({ read: 'users.deleted.read' }),
    status: Object.freeze({ update: 'users.status.update' }),
    password: Object.freeze({ update: 'users.password.update' }),
    roles: Object.freeze({ update: 'users.roles.update' }),
    companies: Object.freeze({ update: 'users.companies.update' }),
    emailVerification: Object.freeze({ resend: 'users.email_verification.resend' }),
  }),
  roles: Object.freeze({
    read: 'roles.read',
    create: 'roles.create',
    update: 'roles.update',
    delete: 'roles.delete',
    permissions: Object.freeze({ update: 'roles.permissions.update' }),
  }),
  permissions: Object.freeze({
    read: 'permissions.read',
    create: 'permissions.create',
    update: 'permissions.update',
    delete: 'permissions.delete',
  }),
});

export default administrationPermissions;
