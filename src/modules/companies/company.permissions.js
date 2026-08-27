const companyPermissions = Object.freeze({
  read: 'companies.read',
  create: 'companies.create',
  update: 'companies.update',
  status: Object.freeze({ update: 'companies.status.update' }),
  delete: 'companies.delete',
  deleted: Object.freeze({
    read: 'companies.deleted.read',
    update: 'companies.deleted.update',
  }),
  accessAll: 'companies.access.all',
});

export default companyPermissions;
