import maintenancePermissions from '../../modules/maintenance/maintenance.permissions.js';
import historyPermissions from '../../modules/audit/history.permissions.js';
import dashboardPermissions from '../../modules/dashboard/dashboard.permissions.js';

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
    name: dashboardPermissions.read,
    description: 'Consulter les indicateurs du tableau de bord.',
  },
  {
    name: dashboardPermissions.financial,
    description: 'Consulter les indicateurs financiers du tableau de bord.',
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
    name: maintenancePermissions.plans.read,
    description: 'Consulter les plans et l’historique de maintenance.',
  },
  {
    name: maintenancePermissions.plans.create,
    description: 'Créer de nouveaux plans de maintenance.',
  },
  {
    name: maintenancePermissions.plans.update,
    description: 'Modifier le paramétrage et le statut des plans de maintenance.',
  },
  {
    name: maintenancePermissions.plans.delete,
    description: 'Supprimer des plans de maintenance.',
  },
  {
    name: maintenancePermissions.plans.execute,
    description: 'Enregistrer un entretien réalisé et recalculer ses prochaines échéances.',
  },
  {
    name: maintenancePermissions.plans.executeWithoutPartReplacement,
    description: 'Enregistrer exceptionnellement un entretien sans remplacer les pièces prévues.',
  },
  {
    name: maintenancePermissions.operations.read,
    description: 'Consulter le catalogue des opérations réutilisables de maintenance.',
  },
  {
    name: maintenancePermissions.operations.create,
    description: 'Ajouter de nouvelles opérations réutilisables de maintenance.',
  },
  {
    name: maintenancePermissions.operations.update,
    description: 'Modifier les opérations réutilisables et leur statut d’activation.',
  },
  {
    name: maintenancePermissions.operations.delete,
    description: 'Supprimer les opérations de maintenance qui ne sont utilisées par aucun plan.',
  },
  {
    name: maintenancePermissions.parts.read,
    description: 'Consulter le catalogue des références de pièces utilisées en maintenance.',
  },
  {
    name: maintenancePermissions.parts.create,
    description: 'Ajouter de nouvelles références de pièces destinées à la maintenance.',
  },
  {
    name: maintenancePermissions.parts.update,
    description: 'Modifier les références de pièces et leur statut d’activation.',
  },
  {
    name: maintenancePermissions.parts.delete,
    description: 'Supprimer les pièces de maintenance qui ne sont utilisées par aucun plan.',
  },
  {
    name: maintenancePermissions.parts.stock.adjustOnHand,
    description: 'Corriger directement la quantité réellement disponible dans le stock atelier.',
  },
  {
    name: maintenancePermissions.parts.stock.adjustOnOrder,
    description: 'Corriger directement la quantité actuellement enregistrée comme commandée.',
  },
  {
    name: maintenancePermissions.parts.stock.order,
    description: 'Enregistrer une nouvelle commande de pièces destinées à la maintenance.',
  },
  {
    name: maintenancePermissions.parts.stock.receive,
    description: 'Réceptionner des pièces commandées et les transférer dans le stock atelier.',
  },
  {
    name: maintenancePermissions.parts.stock.consume,
    description:
      'Enregistrer une pièce utilisée lors d’une intervention de maintenance ponctuelle.',
  },
  {
    name: maintenancePermissions.parts.price.update,
    description: 'Modifier le prix unitaire courant d’une pièce de maintenance.',
  },
  {
    name: historyPermissions.fleet,
    description: 'Consulter l’historique consolidé de la gestion du parc.',
  },
  {
    name: historyPermissions.maintenance,
    description: 'Consulter l’historique consolidé de la maintenance et des stocks de pièces.',
  },
  {
    name: historyPermissions.administration,
    description: 'Consulter l’historique consolidé des actions d’administration.',
  },
];

export default permissionDefinitions;
