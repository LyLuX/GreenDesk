/** Canonical permission descriptions displayed when administrators configure roles. */
const permissionDefinitions = [
  {
    name: 'USER_READ',
    description: 'Consulter la liste et les informations des utilisateurs.',
  },
  {
    name: 'USER_CREATE',
    description: 'Créer de nouveaux comptes utilisateur.',
  },
  {
    name: 'USER_UPDATE',
    description: 'Modifier les informations, le statut et les rôles des utilisateurs.',
  },
  {
    name: 'USER_DELETE',
    description: 'Supprimer des comptes utilisateur.',
  },
  {
    name: 'categories.read',
    description: 'Consulter la liste et le détail des catégories.',
  },
  {
    name: 'categories.create',
    description: 'Ajouter de nouvelles catégories au référentiel.',
  },
  {
    name: 'categories.update',
    description: 'Modifier le nom et la description des catégories.',
  },
  {
    name: 'categories.delete',
    description: 'Supprimer des catégories du référentiel.',
  },
  {
    name: 'materials.read',
    description: 'Consulter les matériels, leurs fichiers et leur historique.',
  },
  {
    name: 'materials.create',
    description: 'Ajouter de nouveaux matériels au parc.',
  },
  {
    name: 'materials.update',
    description: 'Modifier les informations et les fichiers des matériels.',
  },
  {
    name: 'materials.delete',
    description: 'Retirer des matériels du parc.',
  },
  {
    name: 'dashboard.read',
    description: 'Consulter les indicateurs du tableau de bord.',
  },
  {
    name: 'manufacturers.read',
    description: 'Consulter la liste et le détail des fabricants.',
  },
  {
    name: 'manufacturers.create',
    description: 'Ajouter de nouveaux fabricants au référentiel.',
  },
  {
    name: 'manufacturers.update',
    description: 'Modifier les informations des fabricants.',
  },
  {
    name: 'manufacturers.delete',
    description: 'Supprimer des fabricants du référentiel.',
  },
  {
    name: 'suppliers.read',
    description: 'Consulter la liste et le détail des fournisseurs.',
  },
  {
    name: 'suppliers.create',
    description: 'Ajouter de nouveaux fournisseurs au référentiel.',
  },
  {
    name: 'suppliers.update',
    description: 'Modifier les informations des fournisseurs.',
  },
  {
    name: 'suppliers.delete',
    description: 'Supprimer des fournisseurs du référentiel.',
  },
  {
    name: 'maintenance.read',
    description: 'Consulter les plans et l’historique de maintenance.',
  },
  {
    name: 'maintenance.create',
    description: 'Créer de nouveaux plans de maintenance.',
  },
  {
    name: 'maintenance.update',
    description: 'Modifier le paramétrage et le statut des plans de maintenance.',
  },
  {
    name: 'maintenance.delete',
    description: 'Supprimer des plans de maintenance.',
  },
  {
    name: 'maintenance.execute',
    description: 'Enregistrer un entretien réalisé et recalculer ses prochaines échéances.',
  },
];

export default permissionDefinitions;
