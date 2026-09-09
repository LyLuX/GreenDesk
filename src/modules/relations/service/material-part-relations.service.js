import fleetPermissions from '../../../core/constants/fleet-permissions.js';
import maintenancePermissions from '../../maintenance/maintenance.permissions.js';
import MaterialPartRelationsRepository from '../repository/material-part-relations.repository.js';

/** A direct material–part graph; only actual usage contributes to consumption totals. */
export default class MaterialPartRelationsService {
  constructor(repository = new MaterialPartRelationsRepository()) {
    this.repository = repository;
  }

  async getGraph({ mode = 'simplified', permissions = [] } = {}) {
    const canReadMaterials = permissions.includes(fleetPermissions.materials.read);
    const canReadRelations =
      canReadMaterials &&
      permissions.includes(maintenancePermissions.plans.read) &&
      permissions.includes(maintenancePermissions.parts.read);
    const [company, materials, relationships] = await Promise.all([
      this.repository.getCompany(),
      canReadMaterials ? this.repository.getMaterials() : [],
      canReadRelations ? this.repository.getRelationships() : [],
    ]);
    const nodes = [
      { id: 'company', label: company?.name ?? 'Société sélectionnée', kind: 'company' },
    ];
    const edges = [];
    const materialIds = new Set();
    for (const material of materials) {
      const id = `material:${material.uuid}`;
      materialIds.add(id);
      nodes.push({
        id,
        label: material.name,
        kind: 'entity',
        recordType: 'material',
        description:
          [material.model, material.serialNumber && `N° ${material.serialNumber}`]
            .filter(Boolean)
            .join(' · ') || 'Matériel',
        path: `/materials/${material.uuid}`,
        ...(canReadRelations
          ? { plansPath: `/maintenance?materialUuid=${encodeURIComponent(material.uuid)}` }
          : {}),
      });
      edges.push({
        id: `company-${id}`,
        source: 'company',
        target: id,
        label: '',
        kind: 'group',
        hierarchy: true,
      });
    }
    const parts = new Map();
    const links = new Map();
    for (const row of relationships) {
      const source = `material:${row.materialUuid}`;
      if (!materialIds.has(source)) continue;
      const target = `part:${row.partUuid}`;
      if (!parts.has(target)) {
        parts.set(target, {
          id: target,
          label: row.partName,
          kind: 'entity',
          recordType: 'part',
          description: `Réf. ${row.partReference}${Number(row.cataloguePart) ? '' : ' · Pièce supprimée'}`,
          ...(Number(row.cataloguePart) ? { path: '/maintenance/parts' } : {}),
        });
      }
      const id = `${source}-${target}`;
      if (!links.has(id))
        links.set(id, {
          id,
          source,
          target,
          hierarchy: true,
          layout: true,
          planned: false,
          consumptions: [],
        });
      const link = links.get(id);
      link.planned ||= Boolean(Number(row.planned));
      if (Number(row.consumedQuantity) > 0)
        link.consumptions.push({
          quantity: Number(row.consumedQuantity),
          unit: row.unit,
          lastUsedAt: row.lastUsedAt,
        });
    }
    for (const link of links.values()) {
      const consumed = link.consumptions.length > 0;
      edges.push({
        ...link,
        label: link.planned ? (consumed ? 'Prévue et consommée' : 'Prévue') : 'Consommée',
        kind: consumed ? 'association' : 'derived',
      });
    }
    return {
      scope: 'materialParts',
      mode,
      company: company ? { uuid: company.uuid, name: company.name } : null,
      nodes: [...nodes, ...parts.values()],
      edges,
    };
  }
}
