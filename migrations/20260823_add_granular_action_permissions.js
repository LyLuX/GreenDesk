'use strict';

const { randomUUID } = require('node:crypto');

const renamedPermissions = [
  ['USER_READ', 'users.read', 'Consulter les utilisateurs.'],
  ['USER_CREATE', 'users.create', 'Créer de nouveaux comptes utilisateur.'],
  ['USER_UPDATE', 'users.update', 'Modifier les informations générales des utilisateurs.'],
  ['USER_DELETE', 'users.delete', 'Supprimer des utilisateurs.'],
];

const permissions = [
  ['users.status.update', 'Activer ou désactiver des comptes utilisateur.', ['users.update']],
  ['users.password.update', 'Modifier le mot de passe d’un utilisateur.', ['users.update']],
  ['users.roles.update', 'Modifier les rôles attribués à un utilisateur.', ['users.update']],
  ['roles.read', 'Consulter les rôles de l’application.', [], ['ADMIN']],
  ['roles.create', 'Créer de nouveaux rôles applicatifs.', [], ['ADMIN']],
  ['roles.update', 'Modifier le nom et la description des rôles.', [], ['ADMIN']],
  ['roles.delete', 'Supprimer des rôles de l’application.', [], ['ADMIN']],
  ['roles.permissions.update', 'Modifier les permissions attribuées à un rôle.', [], ['ADMIN']],
  ['permissions.read', 'Consulter le référentiel des permissions.', [], ['ADMIN']],
  ['permissions.create', 'Créer de nouvelles permissions applicatives.', [], ['ADMIN']],
  ['permissions.update', 'Modifier les permissions applicatives.', [], ['ADMIN']],
  ['permissions.delete', 'Supprimer des permissions.', [], ['ADMIN']],
  ['categories.status.update', 'Activer ou désactiver des catégories.', ['categories.update']],
  ['materials.status.update', 'Activer ou désactiver des matériels.', ['materials.update']],
  ['materials.photos.create', 'Ajouter des photos aux matériels.', ['materials.update']],
  [
    'materials.photos.set_primary',
    'Définir la photo principale d’un matériel.',
    ['materials.update'],
  ],
  ['materials.documents.create', 'Ajouter des documents aux matériels.', ['materials.update']],
  [
    'materials.files.delete',
    'Supprimer des photos ou des documents des matériels.',
    ['materials.update'],
  ],
  [
    'manufacturers.status.update',
    'Activer ou désactiver des fabricants.',
    ['manufacturers.update'],
  ],
  [
    'manufacturers.logo.upload',
    'Ajouter ou remplacer le logo d’un fabricant.',
    ['manufacturers.create', 'manufacturers.update'],
  ],
  ['manufacturers.logo.delete', 'Supprimer le logo d’un fabricant.', ['manufacturers.update']],
  ['suppliers.status.update', 'Activer ou désactiver des fournisseurs.', ['suppliers.update']],
  [
    'maintenance.status.update',
    'Activer ou désactiver des plans de maintenance.',
    ['maintenance.update'],
  ],
  [
    'maintenance.operations.status.update',
    'Activer ou désactiver des opérations de maintenance.',
    ['maintenance.operations.update'],
  ],
  [
    'maintenance.parts.status.update',
    'Activer ou désactiver des pièces de maintenance.',
    ['maintenance.parts.update'],
  ],
].map(([name, description, sources = [], sourceRoles = []]) => ({
  name,
  description,
  sources,
  sourceRoles,
}));

const addedPermissionNames = permissions.map(({ name }) => name);

const findPermission = async (queryInterface, name) => {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT id, name FROM permissions WHERE name = :name LIMIT 1',
    { replacements: { name } },
  );
  return rows[0] ?? null;
};

const ensurePermission = async (queryInterface, { name, description }, timestamp) => {
  const existing = await findPermission(queryInterface, name);
  if (existing) {
    await queryInterface.sequelize.query(
      'UPDATE permissions SET description = :description, deleted_at = NULL, updated_at = :timestamp WHERE id = :id',
      { replacements: { id: existing.id, description, timestamp } },
    );
    return existing.id;
  }
  await queryInterface.bulkInsert('permissions', [
    { uuid: randomUUID(), name, description, created_at: timestamp, updated_at: timestamp },
  ]);
  return (await findPermission(queryInterface, name)).id;
};

const renamePermission = async (queryInterface, from, to, description, timestamp) => {
  const source = await findPermission(queryInterface, from);
  const target = await findPermission(queryInterface, to);
  if (!source) return ensurePermission(queryInterface, { name: to, description }, timestamp);
  if (!target) {
    await queryInterface.sequelize.query(
      'UPDATE permissions SET name = :to, description = :description, deleted_at = NULL, updated_at = :timestamp WHERE id = :id',
      { replacements: { id: source.id, to, description, timestamp } },
    );
    return source.id;
  }
  await queryInterface.sequelize.query(
    `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
     SELECT :timestamp, :timestamp, role_id, :targetId FROM role_permissions WHERE permission_id = :sourceId`,
    { replacements: { sourceId: source.id, targetId: target.id, timestamp } },
  );
  await queryInterface.bulkDelete('role_permissions', { permission_id: source.id });
  await queryInterface.bulkDelete('permissions', { id: source.id });
  await ensurePermission(queryInterface, { name: to, description }, timestamp);
  return target.id;
};

/** Splits security-sensitive actions while preserving every existing role grant. */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    for (const [from, to, description] of renamedPermissions) {
      await renamePermission(queryInterface, from, to, description, timestamp);
    }
    for (const permission of permissions) {
      await ensurePermission(queryInterface, permission, timestamp);
      for (const sourceName of permission.sources) {
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
           SELECT :timestamp, :timestamp, grants.role_id, target.id
           FROM role_permissions AS grants
           INNER JOIN permissions AS source ON source.id = grants.permission_id
           INNER JOIN permissions AS target ON target.name = :targetName
           WHERE source.name = :sourceName AND source.deleted_at IS NULL AND target.deleted_at IS NULL`,
          { replacements: { sourceName, targetName: permission.name, timestamp } },
        );
      }
      for (const roleName of permission.sourceRoles) {
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
           SELECT :timestamp, :timestamp, roles.id, target.id
           FROM roles
           INNER JOIN permissions AS target ON target.name = :targetName
           WHERE roles.name = :roleName AND roles.deleted_at IS NULL AND target.deleted_at IS NULL`,
          { replacements: { roleName, targetName: permission.name, timestamp } },
        );
      }
    }
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
    await queryInterface.sequelize.query(
      `DELETE grants FROM role_permissions AS grants
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       WHERE permissions.name IN (:names)`,
      { replacements: { names: addedPermissionNames } },
    );
    await queryInterface.bulkDelete('permissions', { name: addedPermissionNames });
    for (const [legacyName, currentName, description] of renamedPermissions) {
      await queryInterface.sequelize.query(
        'UPDATE permissions SET name = :legacyName, description = :description, updated_at = :timestamp WHERE name = :currentName',
        {
          replacements: {
            legacyName,
            currentName,
            description,
            timestamp: new Date(),
          },
        },
      );
    }
  },
};
