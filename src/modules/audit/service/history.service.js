import { normalizePagination } from '../../../core/utils/pagination.js';
import { HISTORY_SECTIONS } from '../history.constants.js';
import HistoryRepository from '../repository/history.repository.js';
import { MAINTENANCE_EXECUTION_TYPES } from '../../maintenance/maintenance.constants.js';

const PRIVATE_FIELDS = new Set([
  'id',
  'passwordHash',
  'authorizationVersion',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);

const plain = (item) => (typeof item?.toJSON === 'function' ? item.toJSON() : item);
const publicValues = (values) =>
  values && Object.fromEntries(Object.entries(values).filter(([key]) => !PRIVATE_FIELDS.has(key)));
const publicUser = (user) => {
  const value = plain(user);
  return value
    ? {
        uuid: value.uuid,
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
      }
    : null;
};
const auditSubjectFallbacks = Object.freeze({
  MATERIAL: 'Matériel supprimé',
  CATEGORY: 'Catégorie supprimée',
  MANUFACTURER: 'Fabricant supprimé',
  SUPPLIER: 'Fournisseur supprimé',
  MAINTENANCE_TASK: 'Plan de maintenance supprimé',
  MAINTENANCE_OPERATION: 'Opération supprimée',
  MAINTENANCE_PART: 'Pièce supprimée',
  USER: 'Utilisateur supprimé',
  ROLE: 'Rôle supprimé',
  PERMISSION: 'Permission supprimée',
});
const auditSubject = (row) => {
  const values = row.newValues || row.oldValues || {};
  const label =
    row.subjectLabel ||
    values.name ||
    values.title ||
    [values.firstName, values.lastName].filter(Boolean).join(' ') ||
    values.email ||
    values.reference ||
    auditSubjectFallbacks[row.entity] ||
    'Élément indisponible';
  return { uuid: row.entityUuid, label };
};
const auditTypes = Object.freeze({
  MATERIAL: 'material',
  CATEGORY: 'category',
  MANUFACTURER: 'manufacturer',
  SUPPLIER: 'supplier',
  MAINTENANCE_TASK: 'maintenance_plan',
  MAINTENANCE_OPERATION: 'maintenance_operation',
  MAINTENANCE_PART: 'maintenance_part',
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
});
const costs = (usages = []) => ({
  parts: usages.map((usage) => {
    const value = plain(usage);
    return {
      name: value.partName,
      reference: value.partReference,
      quantity: value.quantity,
      unit: value.unit,
      unitPrice: value.unitPrice,
      totalCost: value.totalCost,
    };
  }),
  totalCost: usages.reduce((total, usage) => total + Number(plain(usage).totalCost || 0), 0),
});

/** Consolidates heterogeneous immutable journals into one stable public contract. */
export default class HistoryService {
  constructor(repository = new HistoryRepository()) {
    this.repository = repository;
  }

  async list(section, query = {}) {
    const pagination = normalizePagination(query);
    const fetchLimit = pagination.offset + pagination.limit;
    const auditResult = await this.repository.findAuditEvents(section, query, fetchLimit);
    const sources = [
      {
        count: auditResult.count,
        items: auditResult.rows.map((item) => this.mapAudit(item)),
      },
    ];

    if (section === HISTORY_SECTIONS.MAINTENANCE) {
      const [planned, interventions, stock, prices] = await Promise.all([
        this.repository.findPlannedExecutions(query, fetchLimit),
        this.repository.findInterventions(query, fetchLimit),
        this.repository.findStockMovements(query, fetchLimit),
        this.repository.findPriceChanges(query, fetchLimit),
      ]);
      const partById = new Map(stock.parts.map((part) => [String(part.id), plain(part)]));
      sources.push(
        { count: planned.count, items: planned.rows.map((item) => this.mapPlanned(item)) },
        {
          count: interventions.count,
          items: interventions.rows.map((item) => this.mapIntervention(item)),
        },
        {
          count: stock.count,
          items: stock.rows.map((item) => this.mapStock(item, partById)),
        },
        { count: prices.count, items: prices.rows.map((item) => this.mapPrice(item)) },
      );
    }

    const items = sources
      .flatMap((source) => source.items)
      .sort((left, right) => {
        const dateOrder = new Date(right.occurredAt) - new Date(left.occurredAt);
        if (dateOrder) return dateOrder;
        const recordedOrder = new Date(right.recordedAt) - new Date(left.recordedAt);
        return recordedOrder || right.uuid.localeCompare(left.uuid);
      })
      .slice(pagination.offset, pagination.offset + pagination.limit);
    const total = sources.reduce((sum, source) => sum + Number(source.count || 0), 0);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(Math.ceil(total / pagination.limit), 1),
      },
    };
  }

  mapAudit(item) {
    const row = plain(item);
    return {
      uuid: row.uuid,
      occurredAt: row.createdAt,
      recordedAt: row.createdAt,
      type: auditTypes[row.entity],
      action: row.action,
      subject: auditSubject(row),
      user: publicUser(row.user),
      details: {
        oldValues: publicValues(row.oldValues),
        newValues: publicValues(row.newValues),
      },
    };
  }

  mapPlanned(item) {
    const row = plain(item);
    return {
      uuid: row.uuid,
      occurredAt: row.performedAt,
      recordedAt: row.createdAt,
      type: 'planned_execution',
      action:
        row.executionType === MAINTENANCE_EXECUTION_TYPES.WITHOUT_PART_REPLACEMENT
          ? 'EXECUTE_WITHOUT_PARTS'
          : 'EXECUTE',
      subject: { uuid: row.task?.uuid, label: row.task?.title || 'Plan supprimé' },
      context: row.task?.material
        ? { uuid: row.task.material.uuid, label: row.task.material.name }
        : null,
      user: publicUser(row.performedByUser),
      details: {
        comment: row.comment,
        executionType: row.executionType,
        partsSnapshot: row.partsSnapshot,
        ...costs(row.partUsages),
      },
    };
  }

  mapIntervention(item) {
    const row = plain(item);
    return {
      uuid: row.uuid,
      occurredAt: row.performedAt,
      recordedAt: row.createdAt,
      type: 'unplanned_intervention',
      action: 'INTERVENTION',
      subject: row.material
        ? { uuid: row.material.uuid, label: row.material.name }
        : { uuid: null, label: 'Matériel supprimé' },
      user: publicUser(row.performedByUser),
      details: { description: row.description, ...costs(row.partUsages) },
    };
  }

  mapStock(item, partById) {
    const row = plain(item);
    const part = partById.get(String(row.stockableId));
    return {
      uuid: row.uuid,
      occurredAt: row.performedAt,
      recordedAt: row.createdAt,
      type: 'stock_movement',
      action: row.operation.toUpperCase(),
      subject: {
        uuid: part?.uuid || null,
        label: part ? `${part.name} (${part.reference})` : 'Pièce supprimée',
      },
      user: publicUser(row.performedByUser),
      details: {
        quantityOnHandChange: row.quantityOnHandChange,
        quantityOnOrderChange: row.quantityOnOrderChange,
        quantityOnHandAfter: row.quantityOnHandAfter,
        quantityOnOrderAfter: row.quantityOnOrderAfter,
        sourceType: row.sourceType,
        sourceUuid: row.sourceUuid,
      },
    };
  }

  mapPrice(item) {
    const row = plain(item);
    return {
      uuid: row.uuid,
      occurredAt: row.performedAt,
      recordedAt: row.createdAt,
      type: 'price_change',
      action: 'PRICE_UPDATE',
      subject: {
        uuid: row.part?.uuid || null,
        label: row.part ? `${row.part.name} (${row.part.reference})` : 'Pièce supprimée',
      },
      user: publicUser(row.changedByUser),
      details: { previousUnitPrice: row.previousUnitPrice, unitPrice: row.unitPrice },
    };
  }
}
