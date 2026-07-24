'use strict';

const descriptions = {
  USER_READ: 'Consulter la liste et les informations des utilisateurs.',
  USER_CREATE: 'Créer de nouveaux comptes utilisateur.',
  USER_UPDATE: 'Modifier les informations, le statut et les rôles des utilisateurs.',
  USER_DELETE: 'Supprimer des comptes utilisateur.',
  'categories.read': 'Consulter la liste et le détail des catégories.',
  'categories.create': 'Ajouter de nouvelles catégories au référentiel.',
  'categories.update': 'Modifier le nom et la description des catégories.',
  'categories.delete': 'Supprimer des catégories du référentiel.',
  'materials.read': 'Consulter les matériels, leurs fichiers et leur historique.',
  'materials.create': 'Ajouter de nouveaux matériels au parc.',
  'materials.update': 'Modifier les informations et les fichiers des matériels.',
  'materials.delete': 'Retirer des matériels du parc.',
  'dashboard.read': 'Consulter les indicateurs du tableau de bord.',
  'brands.read': 'Consulter la liste et le détail des marques.',
  'brands.create': 'Ajouter de nouvelles marques au référentiel.',
  'brands.update': 'Modifier les informations des marques.',
  'brands.delete': 'Supprimer des marques du référentiel.',
  'maintenance.read': 'Consulter les plans et l’historique de maintenance.',
  'maintenance.create': 'Créer de nouveaux plans de maintenance.',
  'maintenance.update': 'Modifier le paramétrage et le statut des plans de maintenance.',
  'maintenance.delete': 'Supprimer des plans de maintenance.',
  'maintenance.execute': 'Enregistrer un entretien réalisé et recalculer ses prochaines échéances.',
};

const previousDescriptions = {
  USER_READ: 'USER_READ permission',
  USER_CREATE: 'USER_CREATE permission',
  USER_UPDATE: 'USER_UPDATE permission',
  USER_DELETE: 'USER_DELETE permission',
  'categories.read': 'categories.read permission',
  'categories.create': 'categories.create permission',
  'categories.update': 'categories.update permission',
  'categories.delete': 'Delete categories',
  'materials.read': 'materials.read permission',
  'materials.create': 'materials.create permission',
  'materials.update': 'materials.update permission',
  'materials.delete': 'Delete materials',
  'dashboard.read': 'View the dashboard',
  'brands.read': 'Read brands',
  'brands.create': 'Create brands',
  'brands.update': 'Update brands',
  'brands.delete': 'Delete brands',
  'maintenance.read': 'maintenance.read permission',
  'maintenance.create': 'maintenance.create permission',
  'maintenance.update': 'maintenance.update permission',
  'maintenance.delete': 'maintenance.delete permission',
  'maintenance.execute': 'maintenance.execute permission',
};

const updateDescriptions = async (queryInterface, values) => {
  const updatedAt = new Date();
  for (const [name, description] of Object.entries(values)) {
    await queryInterface.bulkUpdate(
      'permissions',
      { description, updated_at: updatedAt },
      { name, deleted_at: null },
    );
  }
};

/** Replaces permission-code placeholders with explicit business descriptions. */
module.exports = {
  async up(queryInterface) {
    await updateDescriptions(queryInterface, descriptions);
  },

  async down(queryInterface) {
    await updateDescriptions(queryInterface, previousDescriptions);
  },
};
