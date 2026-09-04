import fleetPermissions from '../../../core/constants/fleet-permissions.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';
import RecordRelationsRepository from '../repository/record-relations.repository.js';

const hasEvery = (permissionNames, required) =>
  required.every((permission) => permissionNames.has(permission));
const recordId = (type, record) => `${type}:${record.uuid ?? record.id}`;
const byDatabaseId = (records = []) =>
  new Map(records.map((record) => [String(record.id), record]));
const fleetDirectoryGroups = Object.freeze([
  { id: 'materials', recordType: 'material', label: 'Matériels' },
  { id: 'categories', recordType: 'category', label: 'Catégories' },
  { id: 'manufacturers', recordType: 'manufacturer', label: 'Fabricants' },
  { id: 'suppliers', recordType: 'supplier', label: 'Fournisseurs' },
]);
const maintenanceGroups = Object.freeze([
  { id: 'plans', recordType: 'plan', label: 'Plans de maintenance' },
  { id: 'operations', recordType: 'operation', label: 'Opérations' },
  { id: 'parts', recordType: 'part', label: 'Pièces' },
]);
const recordGroups = Object.freeze([...fleetDirectoryGroups, ...maintenanceGroups]);

/** Builds the fleet and maintenance graph from records belonging to the selected company. */
export default class RecordRelationsService {
  constructor(repository = new RecordRelationsRepository()) {
    this.repository = repository;
  }

  async getGraph({ mode = 'simplified', permissions = [] } = {}) {
    const permissionNames = new Set(permissions);
    const keys = [];
    const include = (key, required) => {
      if (hasEvery(permissionNames, required)) keys.push(key);
    };

    include('categories', [fleetPermissions.categories.read]);
    include('manufacturers', [fleetPermissions.manufacturers.read]);
    include('suppliers', [fleetPermissions.suppliers.read]);
    include('materials', [fleetPermissions.materials.read]);
    include('plans', [maintenancePermissions.plans.read]);
    include('operations', [maintenancePermissions.operations.read]);
    include('parts', [maintenancePermissions.parts.read]);
    include('taskParts', [maintenancePermissions.plans.read, maintenancePermissions.parts.read]);
    if (mode === 'complete') include('materialFiles', [fleetPermissions.materials.read]);

    const [company, records] = await Promise.all([
      this.repository.getCompany(),
      this.repository.getRecords(keys),
    ]);
    return this.#buildGraph({ company, mode, records });
  }

  #buildGraph({ company, mode, records }) {
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
    const addEdge = (source, target, kind = 'direct', options = {}) => {
      if (!nodeIds.has(source) || !nodeIds.has(target)) return;
      edgeIndex += 1;
      edges.push({
        id: `relation-${edgeIndex}`,
        source,
        target,
        label: '',
        kind,
        ...options,
      });
    };
    const addRecord = (domain, type, record, label, options = {}) => {
      domains.add(domain);
      addNode({
        id: recordId(type, record),
        label,
        kind: options.kind ?? 'entity',
        recordType: type,
        ...options,
      });
    };

    addNode({
      id: 'company',
      label: company?.name ?? 'Société sélectionnée',
      kind: 'company',
      description: 'Société active',
    });

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
    for (const file of records.materialFiles ?? []) {
      addRecord('fleet', 'materialFile', file, file.originalName, {
        kind: 'technical',
        description: file.kind === 'photo' ? 'Photo du matériel' : 'Document du matériel',
      });
    }

    for (const group of fleetDirectoryGroups) {
      if (!Object.hasOwn(records, group.id)) continue;
      domains.add('fleet');
      addNode({
        id: group.id,
        label: group.label,
        kind: 'domain',
        count: records[group.id].length,
      });
    }
    for (const group of maintenanceGroups) {
      if (!Object.hasOwn(records, group.id)) continue;
      domains.add('maintenance');
      addNode({
        id: group.id,
        label: group.label,
        kind: 'domain',
        count: records[group.id].length,
      });
    }

    const domainDefinitions = {
      fleet: ['Gestion du parc', 'Matériels et référentiels'],
      maintenance: ['Maintenance', 'Plans, opérations et pièces'],
    };
    for (const domain of domains) {
      const [label, description] = domainDefinitions[domain];
      addNode({ id: domain, label, description, kind: 'domain' });
    }
    for (const domain of domains) addEdge('company', domain, 'group', { hierarchy: true });
    for (const group of fleetDirectoryGroups) {
      if (nodeIds.has(group.id)) addEdge('fleet', group.id, 'group', { hierarchy: true });
    }
    for (const group of maintenanceGroups) {
      if (nodeIds.has(group.id)) addEdge('maintenance', group.id, 'group', { hierarchy: true });
    }
    for (const item of nodes.filter(({ recordType }) => recordType)) {
      if (item.recordType === 'materialFile') continue;
      const recordGroup = recordGroups.find(({ recordType }) => recordType === item.recordType);
      const parent = recordGroup?.id ?? 'fleet';
      addEdge(parent, item.id, 'group', { hierarchy: true });
    }

    const categories = byDatabaseId(records.categories);
    const manufacturers = byDatabaseId(records.manufacturers);
    const suppliers = byDatabaseId(records.suppliers);
    const materials = byDatabaseId(records.materials);
    const operations = byDatabaseId(records.operations);
    const plans = byDatabaseId(records.plans);
    const parts = byDatabaseId(records.parts);

    for (const material of records.materials ?? []) {
      const category = categories.get(String(material.categoryId));
      const manufacturer = manufacturers.get(String(material.manufacturerId));
      if (category) {
        addEdge(recordId('category', category), recordId('material', material), 'direct', {
          hierarchy: true,
          layout: true,
        });
      }
      if (manufacturer) {
        addEdge(recordId('manufacturer', manufacturer), recordId('material', material), 'direct', {
          hierarchy: true,
          layout: true,
        });
      }
    }
    for (const part of records.parts ?? []) {
      const manufacturer = manufacturers.get(String(part.manufacturerId));
      const supplier = suppliers.get(String(part.supplierId));
      if (manufacturer) {
        addEdge(recordId('manufacturer', manufacturer), recordId('part', part), 'direct', {
          layout: true,
        });
      }
      if (supplier) {
        addEdge(recordId('supplier', supplier), recordId('part', part), 'direct', {
          layout: true,
        });
      }
    }
    for (const plan of records.plans ?? []) {
      const material = materials.get(String(plan.materialId));
      const operation = operations.get(String(plan.operationId));
      if (material) {
        addEdge(recordId('material', material), recordId('plan', plan), 'direct', {
          layout: true,
        });
      }
      if (operation) {
        addEdge(recordId('operation', operation), recordId('plan', plan), 'direct', {
          hierarchy: true,
          layout: true,
        });
      }
    }
    for (const taskPart of records.taskParts ?? []) {
      const plan = plans.get(String(taskPart.maintenanceTaskId));
      const part = parts.get(String(taskPart.maintenancePartId));
      if (plan && part) {
        addEdge(recordId('plan', plan), recordId('part', part), 'association', {
          hierarchy: true,
          layout: true,
        });
      }
    }
    for (const file of records.materialFiles ?? []) {
      const material = materials.get(String(file.materialId));
      if (material) {
        addEdge(recordId('material', material), recordId('materialFile', file), 'direct', {
          hierarchy: true,
          layout: true,
        });
      }
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
