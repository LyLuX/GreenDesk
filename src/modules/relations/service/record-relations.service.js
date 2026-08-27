import administrationPermissions from '../../../core/constants/administration-permissions.js';
import fleetPermissions from '../../../core/constants/fleet-permissions.js';
import { readableRoleNames } from '../../../core/constants/user-visibility-permissions.js';
import historyPermissions from '../../audit/history.permissions.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';
import RecordRelationsRepository from '../repository/record-relations.repository.js';

const AUDIT_DOMAINS = Object.freeze({
  fleet: new Set(['MATERIAL', 'CATEGORY', 'MANUFACTURER', 'SUPPLIER']),
  maintenance: new Set(['MAINTENANCE_TASK', 'MAINTENANCE_OPERATION', 'MAINTENANCE_PART']),
  administration: new Set(['USER', 'ROLE', 'PERMISSION']),
});

const hasEvery = (permissionNames, required) =>
  required.every((permission) => permissionNames.has(permission));
const recordId = (type, record) => `${type}:${record.uuid ?? record.id}`;
const formatDate = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);
const formatQuantity = (value) =>
  Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const formatUnit = (unit, quantity) => (unit === 'pièce' && Number(quantity) > 1 ? 'pièces' : unit);
const byDatabaseId = (records = []) =>
  new Map(records.map((record) => [String(record.id), record]));

/** Builds the permission-filtered graph from records belonging to the selected company. */
export default class RecordRelationsService {
  constructor(repository = new RecordRelationsRepository()) {
    this.repository = repository;
  }

  async getGraph({ mode = 'simplified', permissions = [] } = {}) {
    const permissionNames = new Set(permissions);
    const complete = mode === 'complete';
    const keys = [];
    const include = (key, required) => {
      if (hasEvery(permissionNames, required)) keys.push(key);
    };

    include('users', [administrationPermissions.users.read]);
    include('roles', [administrationPermissions.roles.read]);
    include('permissions', [administrationPermissions.permissions.read]);
    include('categories', [fleetPermissions.categories.read]);
    include('manufacturers', [fleetPermissions.manufacturers.read]);
    include('suppliers', [fleetPermissions.suppliers.read]);
    include('materials', [fleetPermissions.materials.read]);
    include('plans', [maintenancePermissions.plans.read]);
    include('operations', [maintenancePermissions.operations.read]);
    include('parts', [maintenancePermissions.parts.read]);
    include('taskParts', [maintenancePermissions.plans.read, maintenancePermissions.parts.read]);
    if (complete) {
      include('materialFiles', [fleetPermissions.materials.read]);
      include('planExecutions', [maintenancePermissions.plans.read]);
      include('interventions', [historyPermissions.maintenance]);
      include('partUsages', [historyPermissions.maintenance, maintenancePermissions.parts.read]);
      include('priceHistory', [historyPermissions.maintenance, maintenancePermissions.parts.read]);
      include('stockMovements', [
        historyPermissions.maintenance,
        maintenancePermissions.parts.read,
      ]);
      if (
        [
          historyPermissions.fleet,
          historyPermissions.maintenance,
          historyPermissions.administration,
        ].some((permission) => permissionNames.has(permission))
      ) {
        keys.push('auditLogs');
      }
    }

    const visibleRoleNames = permissions.includes(administrationPermissions.users.all.read)
      ? undefined
      : readableRoleNames(permissions);
    const auditEntities = Object.entries(AUDIT_DOMAINS)
      .filter(([domain]) => permissionNames.has(historyPermissions[domain]))
      .flatMap(([, entities]) => [...entities]);
    const [company, records] = await Promise.all([
      this.repository.getCompany(),
      this.repository.getRecords(keys, {
        visibleRoleNames,
        ...(keys.includes('auditLogs') ? { auditEntities } : {}),
      }),
    ]);
    return this.#buildGraph({ company, complete, mode, permissionNames, records });
  }

  #buildGraph({ company, complete, mode, permissionNames, records }) {
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();
    const domains = new Set();
    let edgeIndex = 0;
    const addNode = (item) => {
      if (nodeIds.has(item.id)) return;
      nodeIds.add(item.id);
      nodes.push(item);
    };
    const addEdge = (source, target, label, kind = 'direct', options = {}) => {
      if (!nodeIds.has(source) || !nodeIds.has(target)) return;
      edgeIndex += 1;
      edges.push({ id: `relation-${edgeIndex}`, source, target, label, kind, ...options });
    };
    const addRecord = (domain, type, record, label, options = {}) => {
      domains.add(domain);
      const id = recordId(type, record);
      addNode({ id, label, kind: options.kind ?? 'entity', recordType: type, ...options });
      return id;
    };

    addNode({
      id: 'company',
      label: company?.name ?? 'Société sélectionnée',
      kind: 'company',
      description: 'Société active',
    });

    for (const user of records.users ?? []) {
      addRecord('administration', 'user', user, `${user.firstName} ${user.lastName}`, {
        description: user.email,
        path: '/users',
      });
    }
    for (const role of records.roles ?? []) {
      addRecord('administration', 'role', role, role.name, {
        description: role.description ?? 'Rôle utilisateur',
        path: '/roles',
      });
    }
    for (const permission of records.permissions ?? []) {
      addRecord('administration', 'permission', permission, permission.name, {
        description: permission.description ?? 'Permission',
        path: '/permissions',
      });
    }
    for (const category of records.categories ?? []) {
      addRecord('fleet', 'category', category, category.name, {
        description: 'Catégorie',
        path: '/categories',
      });
    }
    for (const manufacturer of records.manufacturers ?? []) {
      addRecord('fleet', 'manufacturer', manufacturer, manufacturer.name, {
        description: 'Fabricant',
        path: '/manufacturers',
      });
    }
    for (const supplier of records.suppliers ?? []) {
      addRecord('fleet', 'supplier', supplier, supplier.name, {
        description: 'Fournisseur',
        path: '/suppliers',
      });
    }
    for (const material of records.materials ?? []) {
      const details = [material.model, material.serialNumber && `N° ${material.serialNumber}`]
        .filter(Boolean)
        .join(' · ');
      addRecord('fleet', 'material', material, material.name, {
        description: details || 'Matériel',
        path: `/materials/${material.uuid}`,
      });
    }
    for (const operation of records.operations ?? []) {
      addRecord('maintenance', 'operation', operation, operation.name, {
        description: `Opération ${operation.maintenanceType}`,
        path: '/maintenance/operations',
      });
    }
    for (const plan of records.plans ?? []) {
      const materialUuid = records.materials?.find(
        ({ id }) => String(id) === String(plan.materialId),
      )?.uuid;
      addRecord('maintenance', 'plan', plan, plan.title, {
        description: `Plan ${plan.maintenanceType}`,
        path: materialUuid
          ? `/maintenance?materialUuid=${encodeURIComponent(materialUuid)}`
          : '/maintenance',
      });
    }
    for (const part of records.parts ?? []) {
      addRecord('maintenance', 'part', part, part.name, {
        description: `Réf. ${part.reference}`,
        path: '/maintenance/parts',
      });
    }

    if (complete) {
      for (const file of records.materialFiles ?? []) {
        addRecord('fleet', 'materialFile', file, file.originalName, {
          kind: 'technical',
          description: file.kind === 'photo' ? 'Photo du matériel' : 'Document du matériel',
        });
      }
      for (const execution of records.planExecutions ?? []) {
        addRecord(
          'histories',
          'planExecution',
          execution,
          `Exécution du ${formatDate(execution.performedAt)}`,
          {
            kind: 'technical',
            description: execution.executionType,
            path: '/history/maintenance?type=planned_execution',
          },
        );
      }
      for (const intervention of records.interventions ?? []) {
        addRecord(
          'histories',
          'intervention',
          intervention,
          `Intervention du ${formatDate(intervention.performedAt)}`,
          {
            kind: 'technical',
            description: intervention.description,
            path: '/history/maintenance?type=unplanned_intervention',
          },
        );
      }
      for (const usage of records.partUsages ?? []) {
        addRecord(
          'histories',
          'partUsage',
          usage,
          `${usage.partName} × ${formatQuantity(usage.quantity)}`,
          {
            kind: 'technical',
            description: `Pièce utilisée le ${formatDate(usage.performedAt)}`,
            path: '/history/maintenance',
          },
        );
      }
      for (const price of records.priceHistory ?? []) {
        addRecord('histories', 'priceHistory', price, `Prix du ${formatDate(price.performedAt)}`, {
          kind: 'technical',
          description: `${formatQuantity(price.previousUnitPrice)} € → ${formatQuantity(price.unitPrice)} €`,
          path: '/history/maintenance?type=price_change',
        });
      }
      for (const movement of records.stockMovements ?? []) {
        addRecord('histories', 'stockMovement', movement, `Stock · ${movement.operation}`, {
          kind: 'technical',
          description: `Mouvement du ${formatDate(movement.performedAt)}`,
          path: '/history/maintenance?type=stock_movement',
        });
      }
      for (const audit of records.auditLogs ?? []) {
        const auditDomain = Object.entries(AUDIT_DOMAINS).find(
          ([domain, entities]) =>
            permissionNames.has(historyPermissions[domain]) && entities.has(audit.entity),
        )?.[0];
        if (!auditDomain) continue;
        addRecord('histories', 'audit', audit, audit.action, {
          kind: 'technical',
          description: `${audit.entity} · ${formatDate(audit.createdAt)}`,
          path: `/history/${auditDomain}`,
        });
      }
    }

    const domainDefinitions = {
      administration: ['Administration', 'Utilisateurs, rôles et permissions'],
      fleet: ['Gestion du parc', 'Matériels et référentiels'],
      maintenance: ['Maintenance', 'Plans, opérations et pièces'],
      histories: ['Historiques', 'Exécutions et journaux réels'],
    };
    for (const domain of domains) {
      const [label, description] = domainDefinitions[domain];
      addNode({ id: domain, label, description, kind: 'domain' });
    }
    for (const domain of domains)
      addEdge('company', domain, 'regroupe', 'group', { hierarchy: true });
    for (const item of nodes.filter(({ recordType }) => recordType)) {
      const domain = ['user', 'role', 'permission'].includes(item.recordType)
        ? 'administration'
        : ['operation', 'plan', 'part'].includes(item.recordType)
          ? 'maintenance'
          : [
                'planExecution',
                'intervention',
                'partUsage',
                'priceHistory',
                'stockMovement',
                'audit',
              ].includes(item.recordType)
            ? 'histories'
            : 'fleet';
      addEdge(domain, item.id, 'contient', 'group', { hierarchy: true });
    }

    const users = byDatabaseId(records.users);
    const rolesByName = new Map((records.roles ?? []).map((role) => [role.name, role]));
    const permissionsByName = new Map(
      (records.permissions ?? []).map((permission) => [permission.name, permission]),
    );
    const categories = byDatabaseId(records.categories);
    const manufacturers = byDatabaseId(records.manufacturers);
    const suppliers = byDatabaseId(records.suppliers);
    const materials = byDatabaseId(records.materials);
    const operations = byDatabaseId(records.operations);
    const plans = byDatabaseId(records.plans);
    const parts = byDatabaseId(records.parts);
    const executions = byDatabaseId(records.planExecutions);
    const interventions = byDatabaseId(records.interventions);

    for (const user of records.users ?? []) {
      for (const role of user.roles ?? []) {
        const visibleRole = rolesByName.get(role.name);
        if (visibleRole) {
          addEdge(recordId('user', user), recordId('role', visibleRole), 'possède', 'association', {
            layout: true,
          });
        }
      }
    }
    for (const role of records.roles ?? []) {
      for (const permission of role.permissions ?? []) {
        const visiblePermission = permissionsByName.get(permission.name);
        if (visiblePermission) {
          addEdge(
            recordId('role', role),
            recordId('permission', visiblePermission),
            'accorde',
            'association',
          );
        }
      }
    }
    for (const material of records.materials ?? []) {
      const category = categories.get(String(material.categoryId));
      const manufacturer = manufacturers.get(String(material.manufacturerId));
      if (category) {
        addEdge(
          recordId('category', category),
          recordId('material', material),
          'classe',
          'direct',
          {
            layout: true,
          },
        );
      }
      if (manufacturer) {
        addEdge(
          recordId('manufacturer', manufacturer),
          recordId('material', material),
          'fabrique',
          'direct',
          { layout: true },
        );
      }
    }
    for (const part of records.parts ?? []) {
      const manufacturer = manufacturers.get(String(part.manufacturerId));
      const supplier = suppliers.get(String(part.supplierId));
      if (manufacturer) {
        addEdge(
          recordId('manufacturer', manufacturer),
          recordId('part', part),
          'fabrique',
          'direct',
          {
            layout: true,
          },
        );
      }
      if (supplier) {
        addEdge(recordId('supplier', supplier), recordId('part', part), 'fournit', 'direct', {
          layout: true,
        });
      }
    }
    for (const plan of records.plans ?? []) {
      const material = materials.get(String(plan.materialId));
      const operation = operations.get(String(plan.operationId));
      if (material) {
        addEdge(recordId('material', material), recordId('plan', plan), 'possède', 'direct', {
          layout: true,
        });
      }
      if (operation) {
        addEdge(recordId('operation', operation), recordId('plan', plan), 'définit', 'direct', {
          layout: true,
        });
      }
    }
    for (const taskPart of records.taskParts ?? []) {
      const plan = plans.get(String(taskPart.maintenanceTaskId));
      const part = parts.get(String(taskPart.maintenancePartId));
      if (plan && part) {
        addEdge(
          recordId('plan', plan),
          recordId('part', part),
          `prévoit ${formatQuantity(taskPart.quantity)} ${formatUnit(part.unit, taskPart.quantity)}`,
          'association',
          { layout: true },
        );
      }
    }
    for (const file of records.materialFiles ?? []) {
      const material = materials.get(String(file.materialId));
      if (material) {
        addEdge(
          recordId('material', material),
          recordId('materialFile', file),
          'documente',
          'direct',
          {
            layout: true,
          },
        );
      }
    }
    for (const execution of records.planExecutions ?? []) {
      const plan = plans.get(String(execution.maintenanceTaskId));
      const user = users.get(String(execution.performedBy));
      if (plan) {
        addEdge(
          recordId('plan', plan),
          recordId('planExecution', execution),
          'a produit',
          'direct',
          {
            layout: true,
          },
        );
      }
      if (user) addEdge(recordId('user', user), recordId('planExecution', execution), 'a réalisé');
    }
    for (const intervention of records.interventions ?? []) {
      const material = materials.get(String(intervention.materialId));
      const user = users.get(String(intervention.performedBy));
      if (material) {
        addEdge(
          recordId('material', material),
          recordId('intervention', intervention),
          'a subi',
          'direct',
          { layout: true },
        );
      }
      if (user)
        addEdge(recordId('user', user), recordId('intervention', intervention), 'a réalisé');
    }
    for (const usage of records.partUsages ?? []) {
      const parent = usage.maintenanceHistoryId
        ? executions.get(String(usage.maintenanceHistoryId))
        : interventions.get(String(usage.maintenanceInterventionId));
      const parentType = usage.maintenanceHistoryId ? 'planExecution' : 'intervention';
      const part = parts.get(String(usage.maintenancePartId));
      if (parent) {
        addEdge(
          recordId(parentType, parent),
          recordId('partUsage', usage),
          'a consommé',
          'direct',
          {
            layout: true,
          },
        );
      }
      if (part) {
        addEdge(recordId('part', part), recordId('partUsage', usage), 'a été utilisée', 'derived', {
          layout: true,
        });
      }
    }
    for (const price of records.priceHistory ?? []) {
      const part = parts.get(String(price.maintenancePartId));
      const user = users.get(String(price.changedBy));
      if (part) {
        addEdge(
          recordId('part', part),
          recordId('priceHistory', price),
          'a changé de prix',
          'direct',
          {
            layout: true,
          },
        );
      }
      if (user) addEdge(recordId('user', user), recordId('priceHistory', price), 'a modifié');
    }
    for (const movement of records.stockMovements ?? []) {
      const part = parts.get(String(movement.stockableId));
      const user = users.get(String(movement.performedBy));
      if (part) {
        addEdge(
          recordId('part', part),
          recordId('stockMovement', movement),
          'a eu un mouvement',
          'direct',
          { layout: true },
        );
      }
      if (user)
        addEdge(recordId('user', user), recordId('stockMovement', movement), 'a enregistré');
    }
    const entityNodeIds = new Map(
      nodes
        .filter(({ recordType }) => !['audit'].includes(recordType))
        .map((item) => [item.id.split(':').slice(1).join(':'), item.id]),
    );
    for (const audit of records.auditLogs ?? []) {
      const auditId = recordId('audit', audit);
      const entityId = entityNodeIds.get(audit.entityUuid);
      const user = users.get(String(audit.userId));
      if (entityId) addEdge(entityId, auditId, 'a été journalisé');
      if (user) addEdge(recordId('user', user), auditId, 'a déclenché');
    }

    return {
      scope: 'records',
      mode,
      company: company ? { uuid: company.uuid, name: company.name } : null,
      nodes,
      edges,
    };
  }
}
