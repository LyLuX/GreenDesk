const fleetPermissions = Object.freeze({
  categories: Object.freeze({
    read: 'categories.read',
    create: 'categories.create',
    update: 'categories.update',
    delete: 'categories.delete',
    status: Object.freeze({ update: 'categories.status.update' }),
  }),
  materials: Object.freeze({
    read: 'materials.read',
    create: 'materials.create',
    update: 'materials.update',
    delete: 'materials.delete',
    status: Object.freeze({ update: 'materials.status.update' }),
    photos: Object.freeze({
      create: 'materials.photos.create',
      setPrimary: 'materials.photos.set_primary',
    }),
    documents: Object.freeze({ create: 'materials.documents.create' }),
    files: Object.freeze({ delete: 'materials.files.delete' }),
  }),
  manufacturers: Object.freeze({
    read: 'manufacturers.read',
    create: 'manufacturers.create',
    update: 'manufacturers.update',
    delete: 'manufacturers.delete',
    status: Object.freeze({ update: 'manufacturers.status.update' }),
    logo: Object.freeze({
      upload: 'manufacturers.logo.upload',
      delete: 'manufacturers.logo.delete',
    }),
  }),
  suppliers: Object.freeze({
    read: 'suppliers.read',
    create: 'suppliers.create',
    update: 'suppliers.update',
    delete: 'suppliers.delete',
    status: Object.freeze({ update: 'suppliers.status.update' }),
  }),
});

export default fleetPermissions;
