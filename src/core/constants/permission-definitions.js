import administrationPermissions from './administration-permissions.js';
import fleetPermissions from './fleet-permissions.js';
import maintenancePermissions from '../../modules/maintenance/maintenance.permissions.js';
import historyPermissions from '../../modules/audit/history.permissions.js';
import dashboardPermissions from '../../modules/dashboard/dashboard.permissions.js';
import companyPermissions from '../../modules/companies/company.permissions.js';
import relationsPermissions from '../../modules/relations/relations.permissions.js';

/** Canonical permission descriptions displayed when administrators configure roles. */
const permissionDefinitions = [
  { name: administrationPermissions.users.read, description: 'Consulter les utilisateurs.' },
  {
    name: administrationPermissions.users.all.read,
    description: 'Consulter tous les utilisateurs, indépendamment de leur rôle.',
  },
  {
    name: administrationPermissions.users.create,
    description: 'Créer de nouveaux comptes utilisateur.',
  },
  {
    name: administrationPermissions.users.update,
    description: 'Modifier les informations générales des utilisateurs.',
  },
  { name: administrationPermissions.users.delete, description: 'Supprimer des utilisateurs.' },
  {
    name: administrationPermissions.users.deleted.update,
    description: 'Restaurer des comptes utilisateur supprimés.',
  },
  {
    name: administrationPermissions.users.deleted.read,
    description: 'Consulter les comptes utilisateur supprimés.',
  },
  {
    name: administrationPermissions.users.status.update,
    description: 'Activer ou désactiver des comptes utilisateur.',
  },
  {
    name: administrationPermissions.users.password.update,
    description: 'Modifier le mot de passe d’un utilisateur.',
  },
  {
    name: administrationPermissions.users.roles.update,
    description: 'Modifier les rôles attribués à un utilisateur.',
  },
  {
    name: administrationPermissions.users.companies.update,
    description: 'Modifier les sociétés attribuées à un utilisateur.',
  },
  {
    name: companyPermissions.read,
    description: 'Consulter le référentiel des sociétés.',
  },
  { name: companyPermissions.create, description: 'Créer de nouvelles sociétés.' },
  {
    name: companyPermissions.update,
    description: 'Modifier les informations générales des sociétés.',
  },
  {
    name: companyPermissions.logo.update,
    description: 'Ajouter, remplacer ou supprimer le logo d’une société.',
  },
  {
    name: companyPermissions.status.update,
    description: 'Activer ou désactiver des sociétés.',
  },
  { name: companyPermissions.delete, description: 'Supprimer des sociétés vides.' },
  {
    name: companyPermissions.deleted.read,
    description: 'Consulter les sociétés supprimées.',
  },
  {
    name: companyPermissions.deleted.update,
    description: 'Restaurer des sociétés supprimées.',
  },
  {
    name: companyPermissions.accessAll,
    description: 'Accéder aux données de toutes les sociétés sans restriction d’appartenance.',
  },
  {
    name: administrationPermissions.users.emailVerification.resend,
    description: 'Renvoyer l’email de vérification d’un compte utilisateur.',
  },
  {
    name: administrationPermissions.roles.read,
    description: 'Consulter les rôles de l’application.',
  },
  {
    name: administrationPermissions.roles.create,
    description: 'Créer de nouveaux rôles applicatifs.',
  },
  {
    name: administrationPermissions.roles.update,
    description: 'Modifier la description des rôles.',
  },
  {
    name: administrationPermissions.roles.delete,
    description: 'Supprimer des rôles de l’application.',
  },
  {
    name: administrationPermissions.roles.permissions.update,
    description: 'Modifier les permissions attribuées à un rôle.',
  },
  {
    name: administrationPermissions.permissions.read,
    description: 'Consulter le référentiel des permissions.',
  },
  {
    name: administrationPermissions.permissions.create,
    description: 'Créer de nouvelles permissions applicatives.',
  },
  {
    name: administrationPermissions.permissions.update,
    description: 'Modifier les permissions applicatives.',
  },
  {
    name: administrationPermissions.permissions.delete,
    description: 'Supprimer des permissions.',
  },
  {
    name: fleetPermissions.categories.read,
    description: 'Consulter la liste et le détail des catégories.',
  },
  {
    name: fleetPermissions.categories.create,
    description: 'Ajouter de nouvelles catégories au référentiel.',
  },
  {
    name: fleetPermissions.categories.update,
    description: 'Modifier le nom et la description des catégories.',
  },
  {
    name: fleetPermissions.categories.delete,
    description: 'Supprimer des catégories du référentiel.',
  },
  {
    name: fleetPermissions.categories.status.update,
    description: 'Activer ou désactiver des catégories.',
  },
  {
    name: fleetPermissions.materials.read,
    description: 'Consulter les matériels, leurs fichiers et leur historique.',
  },
  {
    name: fleetPermissions.materials.create,
    description: 'Ajouter de nouveaux matériels au parc.',
  },
  {
    name: fleetPermissions.materials.update,
    description: 'Modifier les informations des matériels.',
  },
  {
    name: fleetPermissions.materials.delete,
    description: 'Retirer des matériels du parc.',
  },
  {
    name: fleetPermissions.materials.status.update,
    description: 'Activer ou désactiver des matériels.',
  },
  {
    name: fleetPermissions.materials.photos.create,
    description: 'Ajouter des photos aux matériels.',
  },
  {
    name: fleetPermissions.materials.photos.setPrimary,
    description: 'Définir la photo principale d’un matériel.',
  },
  {
    name: fleetPermissions.materials.documents.create,
    description: 'Ajouter des documents aux matériels.',
  },
  {
    name: fleetPermissions.materials.files.delete,
    description: 'Supprimer des photos ou des documents des matériels.',
  },
  { name: dashboardPermissions.read, description: 'Consulter les indicateurs du tableau de bord.' },
  {
    name: dashboardPermissions.financial,
    description: 'Consulter les indicateurs financiers du tableau de bord.',
  },
  {
    name: relationsPermissions.read,
    description: 'Consulter la cartographie des relations de la société active.',
  },
  {
    name: fleetPermissions.manufacturers.read,
    description: 'Consulter la liste et le détail des fabricants.',
  },
  {
    name: fleetPermissions.manufacturers.create,
    description: 'Ajouter de nouveaux fabricants au référentiel.',
  },
  {
    name: fleetPermissions.manufacturers.update,
    description: 'Modifier les informations des fabricants.',
  },
  {
    name: fleetPermissions.manufacturers.delete,
    description: 'Supprimer des fabricants du référentiel.',
  },
  {
    name: fleetPermissions.manufacturers.status.update,
    description: 'Activer ou désactiver des fabricants.',
  },
  {
    name: fleetPermissions.manufacturers.logo.upload,
    description: 'Ajouter ou remplacer le logo d’un fabricant.',
  },
  {
    name: fleetPermissions.manufacturers.logo.delete,
    description: 'Supprimer le logo d’un fabricant.',
  },
  {
    name: fleetPermissions.suppliers.read,
    description: 'Consulter la liste et le détail des fournisseurs.',
  },
  {
    name: fleetPermissions.suppliers.create,
    description: 'Ajouter de nouveaux fournisseurs au référentiel.',
  },
  {
    name: fleetPermissions.suppliers.update,
    description: 'Modifier les informations des fournisseurs.',
  },
  {
    name: fleetPermissions.suppliers.delete,
    description: 'Supprimer des fournisseurs du référentiel.',
  },
  {
    name: fleetPermissions.suppliers.status.update,
    description: 'Activer ou désactiver des fournisseurs.',
  },
  {
    name: maintenancePermissions.plans.read,
    description: 'Consulter les plans et l’historique de maintenance.',
  },
  {
    name: maintenancePermissions.sheets.read,
    description: 'Consulter et imprimer les fiches de maintenance.',
  },
  {
    name: maintenancePermissions.plans.create,
    description: 'Créer de nouveaux plans de maintenance.',
  },
  {
    name: maintenancePermissions.plans.update,
    description: 'Modifier le paramétrage des plans de maintenance.',
  },
  {
    name: maintenancePermissions.plans.delete,
    description: 'Supprimer des plans de maintenance.',
  },
  {
    name: maintenancePermissions.plans.status.update,
    description: 'Activer ou désactiver des plans de maintenance.',
  },
  {
    name: maintenancePermissions.plans.execute,
    description: 'Enregistrer un entretien réalisé et recalculer ses prochaines échéances.',
  },
  {
    name: maintenancePermissions.plans.executeWithoutPartReplacement,
    description:
      'Enregistrer exceptionnellement un entretien sans remplacer tout ou partie des pièces prévues.',
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
    description: 'Modifier les opérations réutilisables de maintenance.',
  },
  {
    name: maintenancePermissions.operations.delete,
    description: 'Supprimer les opérations de maintenance qui ne sont utilisées par aucun plan.',
  },
  {
    name: maintenancePermissions.operations.status.update,
    description: 'Activer ou désactiver des opérations de maintenance.',
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
    description: 'Modifier les références de pièces destinées à la maintenance.',
  },
  {
    name: maintenancePermissions.parts.delete,
    description: 'Supprimer les pièces de maintenance qui ne sont utilisées par aucun plan.',
  },
  {
    name: maintenancePermissions.parts.status.update,
    description: 'Activer ou désactiver des pièces de maintenance.',
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
    name: maintenancePermissions.parts.stock.minimumUpdate,
    description: 'Modifier la quantité de stock minimum d’une pièce de maintenance.',
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
