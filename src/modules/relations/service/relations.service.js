import administrationPermissions from '../../../core/constants/administration-permissions.js';
import fleetPermissions from '../../../core/constants/fleet-permissions.js';
import { readableRoleNames } from '../../../core/constants/user-visibility-permissions.js';
import historyPermissions from '../../audit/history.permissions.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';
import RelationsRepository from '../repository/relations.repository.js';

const node = (id, label, options = {}) => ({ id, label, ...options });
const nodes = [
  node('company', 'Société sélectionnée', {
    kind: 'company',
    description: 'Racine des données de la société active.',
  }),
  node('administration', 'Administration', {
    kind: 'domain',
    description: 'Accès, rôles et permissions.',
  }),
  node('fleet', 'Gestion du parc', {
    kind: 'domain',
    description: 'Matériels et référentiels associés.',
  }),
  node('maintenance', 'Maintenance', {
    kind: 'domain',
    description: 'Plans, opérations et pièces.',
  }),
  node('histories', 'Historiques', {
    kind: 'domain',
    description: 'Exécutions et journaux techniques.',
    completeOnly: true,
  }),
  node('users', 'Utilisateurs', {
    kind: 'entity',
    permission: administrationPermissions.users.read,
    path: '/users',
  }),
  node('roles', 'Rôles', {
    kind: 'entity',
    permission: administrationPermissions.roles.read,
    path: '/roles',
  }),
  node('permissions', 'Permissions', {
    kind: 'entity',
    permission: administrationPermissions.permissions.read,
    path: '/permissions',
  }),
  node('categories', 'Catégories', {
    kind: 'entity',
    permission: fleetPermissions.categories.read,
    path: '/categories',
  }),
  node('manufacturers', 'Fabricants', {
    kind: 'entity',
    permission: fleetPermissions.manufacturers.read,
    path: '/manufacturers',
  }),
  node('suppliers', 'Fournisseurs', {
    kind: 'entity',
    permission: fleetPermissions.suppliers.read,
    path: '/suppliers',
  }),
  node('materials', 'Matériels', {
    kind: 'entity',
    permission: fleetPermissions.materials.read,
    path: '/materials',
  }),
  node('plans', 'Plans de maintenance', {
    kind: 'entity',
    permission: maintenancePermissions.plans.read,
    path: '/maintenance',
  }),
  node('operations', 'Opérations', {
    kind: 'entity',
    permission: maintenancePermissions.operations.read,
    path: '/maintenance/operations',
  }),
  node('parts', 'Pièces', {
    kind: 'entity',
    permission: maintenancePermissions.parts.read,
    path: '/maintenance/parts',
  }),
  node('materialFiles', 'Fichiers des matériels', {
    kind: 'technical',
    permission: fleetPermissions.materials.read,
    completeOnly: true,
  }),
  node('taskParts', 'Pièces prévues et quantités', {
    kind: 'technical',
    permissions: [maintenancePermissions.plans.read, maintenancePermissions.parts.read],
    completeOnly: true,
  }),
  node('planExecutions', 'Exécutions des plans', {
    kind: 'technical',
    permission: maintenancePermissions.plans.read,
    path: '/history/maintenance?type=planned_execution',
    completeOnly: true,
  }),
  node('interventions', 'Interventions hors plan', {
    kind: 'technical',
    permission: historyPermissions.maintenance,
    path: '/history/maintenance?type=unplanned_intervention',
    completeOnly: true,
  }),
  node('partUsages', 'Pièces réellement utilisées', {
    kind: 'technical',
    permissions: [historyPermissions.maintenance, maintenancePermissions.parts.read],
    path: '/history/maintenance',
    completeOnly: true,
  }),
  node('priceHistory', 'Historique des prix', {
    kind: 'technical',
    permissions: [historyPermissions.maintenance, maintenancePermissions.parts.read],
    path: '/history/maintenance?type=price_change',
    completeOnly: true,
  }),
  node('stockMovements', 'Mouvements de stock', {
    kind: 'technical',
    permissions: [historyPermissions.maintenance, maintenancePermissions.parts.read],
    path: '/history/maintenance?type=stock_movement',
    completeOnly: true,
  }),
  node('fleetAudit', 'Historique du parc', {
    kind: 'technical',
    permission: historyPermissions.fleet,
    path: '/history/fleet',
    completeOnly: true,
  }),
  node('maintenanceAudit', 'Historique de maintenance', {
    kind: 'technical',
    permission: historyPermissions.maintenance,
    path: '/history/maintenance',
    completeOnly: true,
  }),
  node('administrationAudit', 'Historique administratif', {
    kind: 'technical',
    permission: historyPermissions.administration,
    path: '/history/administration',
    completeOnly: true,
  }),
];

const edge = (source, target, label, kind = 'direct', options = {}) => ({
  id: `${source}-${target}`,
  source,
  target,
  label,
  kind,
  ...options,
});

const edges = [
  edge('company', 'administration', 'administre', 'group', { hierarchy: true }),
  edge('company', 'fleet', 'possède', 'group', { hierarchy: true }),
  edge('company', 'maintenance', 'organise', 'group', { hierarchy: true }),
  edge('company', 'histories', 'journalise', 'group', { hierarchy: true, completeOnly: true }),
  edge('administration', 'users', 'regroupe', 'group', { hierarchy: true }),
  edge('administration', 'roles', 'regroupe', 'group', { hierarchy: true }),
  edge('administration', 'permissions', 'regroupe', 'group', { hierarchy: true }),
  edge('fleet', 'categories', 'regroupe', 'group', { hierarchy: true }),
  edge('fleet', 'manufacturers', 'regroupe', 'group', { hierarchy: true }),
  edge('fleet', 'suppliers', 'regroupe', 'group', { hierarchy: true }),
  edge('fleet', 'materials', 'regroupe', 'group', { hierarchy: true }),
  edge('maintenance', 'plans', 'regroupe', 'group', { hierarchy: true }),
  edge('maintenance', 'operations', 'regroupe', 'group', { hierarchy: true }),
  edge('maintenance', 'parts', 'regroupe', 'group', { hierarchy: true }),
  edge('histories', 'fleetAudit', 'regroupe', 'group', { hierarchy: true, completeOnly: true }),
  edge('histories', 'maintenanceAudit', 'regroupe', 'group', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('histories', 'administrationAudit', 'regroupe', 'group', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('users', 'roles', 'possèdent', 'association'),
  edge('roles', 'permissions', 'accordent', 'association'),
  edge('categories', 'materials', 'classent'),
  edge('manufacturers', 'materials', 'fabriquent'),
  edge('manufacturers', 'parts', 'fabriquent'),
  edge('suppliers', 'parts', 'fournissent'),
  edge('materials', 'plans', 'possèdent', 'direct', { hierarchy: true }),
  edge('materials', 'parts', 'utilisent via la maintenance', 'derived', { hierarchy: true }),
  edge('operations', 'plans', 'définissent'),
  edge('plans', 'parts', 'prévoient', 'derived', { hierarchy: true }),
  edge('materials', 'materialFiles', 'documentent', 'direct', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('plans', 'taskParts', 'quantifient', 'association', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('taskParts', 'parts', 'référencent', 'association', { completeOnly: true }),
  edge('plans', 'planExecutions', 'produisent', 'direct', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('materials', 'interventions', 'subissent', 'direct', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('planExecutions', 'partUsages', 'consomment', 'direct', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('interventions', 'partUsages', 'consomment', 'direct', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('parts', 'partUsages', 'sont utilisées', 'derived', { completeOnly: true }),
  edge('parts', 'priceHistory', 'changent de prix', 'direct', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('parts', 'stockMovements', 'mouvementent le stock', 'derived', {
    hierarchy: true,
    completeOnly: true,
  }),
  edge('users', 'planExecutions', 'réalisent', 'direct', { completeOnly: true }),
  edge('users', 'interventions', 'réalisent', 'direct', { completeOnly: true }),
  edge('users', 'priceHistory', 'modifient', 'direct', { completeOnly: true }),
  edge('users', 'stockMovements', 'enregistrent', 'direct', { completeOnly: true }),
  edge('users', 'administrationAudit', 'déclenchent', 'direct', { completeOnly: true }),
];

const hasNodePermission = (definition, permissionNames) => {
  if (definition.permission) return permissionNames.has(definition.permission);
  if (definition.permissions) {
    return definition.permissions.every((permission) => permissionNames.has(permission));
  }
  return true;
};

/** Builds a permission-filtered map of the current company's model relationships. */
export default class RelationsService {
  constructor(repository = new RelationsRepository()) {
    this.repository = repository;
  }

  async getGraph({ mode = 'simplified', permissions = [] } = {}) {
    const permissionNames = new Set(permissions);
    const complete = mode === 'complete';
    const allowedDefinitions = nodes.filter(
      (definition) =>
        (complete || !definition.completeOnly) && hasNodePermission(definition, permissionNames),
    );
    const countKeys = allowedDefinitions
      .filter(({ kind }) => kind === 'entity' || kind === 'technical')
      .map(({ id }) => id);
    const visibleRoleNames = permissions.includes(administrationPermissions.users.all.read)
      ? undefined
      : readableRoleNames(permissions);
    const [company, counts] = await Promise.all([
      this.repository.getCompany(),
      this.repository.getCounts(countKeys, { visibleRoleNames }),
    ]);
    const allowedIds = new Set(allowedDefinitions.map(({ id }) => id));
    let allowedEdges = edges.filter(
      (definition) =>
        (complete || !definition.completeOnly) &&
        allowedIds.has(definition.source) &&
        allowedIds.has(definition.target),
    );
    const connectedDomainIds = new Set(
      allowedEdges.flatMap(({ source, target }) => [source, target]),
    );
    const visibleDefinitions = allowedDefinitions.filter(
      ({ id, kind }) => kind !== 'domain' || connectedDomainIds.has(id),
    );
    const visibleIds = new Set(visibleDefinitions.map(({ id }) => id));
    allowedEdges = allowedEdges.filter(
      ({ source, target }) => visibleIds.has(source) && visibleIds.has(target),
    );

    return {
      mode,
      company: company ? { uuid: company.uuid, name: company.name } : null,
      nodes: visibleDefinitions.map(
        ({
          completeOnly: _completeOnly,
          permission: _permission,
          permissions: _permissions,
          ...item
        }) => ({
          ...item,
          ...(item.id === 'company' && company ? { label: company.name } : {}),
          ...(Object.hasOwn(counts, item.id) ? { count: counts[item.id] } : {}),
        }),
      ),
      edges: allowedEdges.map(({ completeOnly: _completeOnly, ...item }) => item),
    };
  }
}
