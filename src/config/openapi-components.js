import {
  MAINTENANCE_DEADLINE_STATUSES,
  MAINTENANCE_EXECUTION_TYPES,
  MAINTENANCE_PART_ACTIONS,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_TYPES,
} from '../modules/maintenance/maintenance.constants.js';
import { STOCK_STATUS_VALUES } from '../core/inventory/stock-status.js';
import { STOCK_OPERATIONS, STOCK_OPERATION_VALUES } from '../core/inventory/stock-operation.js';
import { DOCUMENT_TYPES } from '../modules/materials/material-file.constants.js';
import { MAX_UNIT_PRICE } from '../core/utils/money.js';

const uuid = { type: 'string', format: 'uuid' };
const date = { type: 'string', format: 'date' };
const dateTime = { type: 'string', format: 'date-time' };
const nullableString = { type: 'string', nullable: true };
const nullableDate = { ...date, nullable: true };
const nullableDateTime = { ...dateTime, nullable: true };
const timestamps = {
  createdAt: dateTime,
  updatedAt: dateTime,
  deletedAt: nullableDateTime,
};
const writeText = (maxLength) => ({ type: 'string', maxLength });
const decimalQuantity = (maximum = 1000000, { allowZero = false } = {}) => ({
  type: 'number',
  format: 'double',
  minimum: allowZero ? 0 : 0.01,
  maximum,
  multipleOf: 0.01,
});
const success = (data) => ({
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', enum: [true] },
    data,
  },
});
const arrayOf = (schema) => ({ type: 'array', items: schema });
const reference = (name) => ({ $ref: `#/components/schemas/${name}` });
const pageOf = (name) => ({
  type: 'object',
  required: ['items', 'pagination'],
  properties: {
    items: arrayOf(reference(name)),
    pagination: reference('Pagination'),
  },
});
const cacheControlHeaders = {
  'Cache-Control': { $ref: '#/components/headers/CacheControl' },
};
const withCacheControl = (response) => ({
  ...response,
  headers: { ...cacheControlHeaders, ...(response.headers ?? {}) },
});

const permission = {
  type: 'object',
  required: ['uuid', 'name'],
  properties: {
    id: { type: 'integer', readOnly: true },
    uuid,
    name: writeText(150),
    description: { ...nullableString, maxLength: 500 },
    ...timestamps,
  },
};

const role = {
  type: 'object',
  required: ['uuid', 'name', 'permissions'],
  properties: {
    id: { type: 'integer', readOnly: true },
    uuid,
    name: writeText(100),
    description: { ...nullableString, maxLength: 500 },
    permissions: arrayOf(reference('Permission')),
    ...timestamps,
  },
};

const company = {
  type: 'object',
  required: ['uuid', 'name', 'active'],
  properties: {
    id: { type: 'integer', readOnly: true },
    uuid,
    name: writeText(150),
    description: { ...nullableString, maxLength: 1000 },
    active: { type: 'boolean' },
    ...timestamps,
    deletedAt: {
      ...nullableDateTime,
      description:
        'Date de suppression logique de la société, exposée par les filtres de suppression et remise à `null` après une restauration réussie.',
    },
  },
};

const userCompany = {
  type: 'object',
  required: ['uuid', 'name', 'active'],
  properties: {
    uuid,
    name: writeText(150),
    active: { type: 'boolean' },
  },
};

const user = {
  type: 'object',
  required: [
    'uuid',
    'firstName',
    'lastName',
    'email',
    'emailVerifiedAt',
    'isActive',
    'roles',
    'companies',
  ],
  properties: {
    id: { type: 'integer', readOnly: true },
    uuid,
    firstName: { type: 'string', maxLength: 100 },
    lastName: {
      type: 'string',
      maxLength: 100,
      description: 'Nom de famille normalisé et stocké en majuscules.',
    },
    email: { type: 'string', format: 'email', maxLength: 255 },
    emailVerifiedAt: nullableDateTime,
    isActive: { type: 'boolean' },
    lastLoginAt: {
      ...nullableDateTime,
      description: 'Dernière connexion, utilisée pour trier la liste des utilisateurs par défaut.',
    },
    roles: arrayOf(reference('UserRole')),
    companies: arrayOf(reference('UserCompany')),
    ...timestamps,
    deletedAt: {
      ...nullableDateTime,
      description:
        'Date de suppression logique du compte, exposée par les filtres de suppression et remise à `null` après une restauration réussie.',
    },
  },
};

const category = {
  type: 'object',
  required: ['uuid', 'name', 'active'],
  properties: {
    id: { type: 'integer', readOnly: true },
    uuid,
    name: writeText(150),
    description: nullableString,
    active: { type: 'boolean' },
    createdBy: { type: 'integer', nullable: true, readOnly: true },
    updatedBy: { type: 'integer', nullable: true, readOnly: true },
    ...timestamps,
  },
};

const manufacturerSummary = {
  type: 'object',
  required: ['uuid', 'name', 'hasLogo'],
  properties: {
    uuid,
    name: writeText(150),
    hasLogo: { type: 'boolean' },
  },
};

const manufacturer = {
  type: 'object',
  required: ['uuid', 'name', 'active', 'hasLogo'],
  properties: {
    ...manufacturerSummary.properties,
    active: { type: 'boolean' },
    ...timestamps,
  },
};

const materialFile = {
  type: 'object',
  required: ['uuid', 'kind', 'originalName', 'mimeType', 'size', 'isPrimary'],
  properties: {
    uuid,
    kind: { type: 'string', enum: ['photo', 'document'] },
    documentType: { type: 'string', enum: DOCUMENT_TYPES, nullable: true },
    name: {
      type: 'string',
      maxLength: 150,
      nullable: true,
      description: 'Nom facultatif choisi par l’utilisateur pour identifier une photo.',
    },
    originalName: writeText(255),
    fileName: writeText(255),
    mimeType: writeText(100),
    size: { type: 'integer', minimum: 0 },
    isPrimary: { type: 'boolean' },
    createdAt: dateTime,
  },
};

const material = {
  type: 'object',
  required: ['uuid', 'name', 'unit', 'purchasePrice', 'active'],
  properties: {
    uuid,
    name: writeText(150),
    description: nullableString,
    unit: writeText(50),
    purchasePrice: {
      type: 'string',
      pattern: '^\\d+(\\.\\d{1,2})?$',
      example: '930.00',
      description: 'Valeur DECIMAL renvoyée sans perte de précision.',
    },
    model: { ...nullableString, maxLength: 150 },
    serialNumber: { ...nullableString, maxLength: 150 },
    purchaseDate: nullableDate,
    commissionedAt: nullableDate,
    retiredAt: nullableDate,
    notes: nullableString,
    active: { type: 'boolean' },
    manufacturer: { allOf: [reference('ManufacturerSummary')], nullable: true },
    category: {
      type: 'object',
      nullable: true,
      properties: { uuid, name: writeText(150) },
    },
    files: arrayOf(reference('MaterialFile')),
    ...timestamps,
  },
};

const materialOption = {
  type: 'object',
  required: ['uuid', 'name', 'active'],
  properties: {
    uuid,
    name: writeText(150),
    active: { type: 'boolean' },
  },
};

const maintenanceOperation = {
  type: 'object',
  required: ['uuid', 'name', 'maintenanceType', 'active'],
  properties: {
    uuid,
    name: writeText(150),
    description: nullableString,
    maintenanceType: { type: 'string', enum: MAINTENANCE_TYPES },
    active: { type: 'boolean' },
    ...timestamps,
  },
};

const supplier = {
  type: 'object',
  required: ['uuid', 'name', 'active'],
  properties: {
    uuid,
    name: writeText(150),
    contactName: { ...nullableString, maxLength: 150 },
    email: { type: 'string', format: 'email', nullable: true, maxLength: 254 },
    phone: { ...nullableString, maxLength: 50 },
    notes: nullableString,
    active: { type: 'boolean' },
    ...timestamps,
  },
};

const maintenancePart = {
  type: 'object',
  required: [
    'uuid',
    'name',
    'reference',
    'unit',
    'unitPrice',
    'quantityOnHand',
    'quantityOnOrder',
    'minimumStockQuantity',
    'stockStatus',
    'stockQuantity',
    'active',
  ],
  properties: {
    uuid,
    name: writeText(150),
    manufacturer: { ...nullableString, maxLength: 150 },
    manufacturerUuid: { ...uuid, nullable: true },
    supplier: { ...nullableString, maxLength: 150 },
    supplierUuid: { ...uuid, nullable: true },
    reference: writeText(150),
    supplierReference: { ...nullableString, maxLength: 150 },
    unit: writeText(50),
    unitPrice: { type: 'number', format: 'double', minimum: 0 },
    totalMaintenanceCost: {
      type: 'number',
      format: 'double',
      minimum: 0,
      description: 'Coût cumulé des utilisations réelles de cette pièce en maintenance.',
    },
    stockStatus: {
      type: 'string',
      enum: STOCK_STATUS_VALUES,
      description:
        'État calculé par rapport au stock minimum de la pièce : disponible lorsque le stock atelier atteint le seuil, commandé lorsque les commandes couvrent le manque ou qu’une commande existe pour un seuil nul sans stock atelier, sinon à commander.',
    },
    stockQuantity: {
      ...decimalQuantity(2000000, { allowZero: true }),
      deprecated: true,
      description: 'Somme de compatibilité. Utiliser les deux quantités détaillées.',
    },
    quantityOnHand: decimalQuantity(1000000, { allowZero: true }),
    quantityOnOrder: decimalQuantity(1000000, { allowZero: true }),
    minimumStockQuantity: {
      ...decimalQuantity(1000000, { allowZero: true }),
      default: 1,
      description: 'Seuil individuel utilisé pour identifier un stock faible.',
    },
    active: { type: 'boolean' },
    ...timestamps,
  },
};

const maintenanceTask = {
  type: 'object',
  required: [
    'uuid',
    'title',
    'maintenanceType',
    'intervalDays',
    'lastMaintenanceDate',
    'nextMaintenanceDate',
    'priority',
    'active',
    'status',
    'remainingDays',
  ],
  properties: {
    uuid,
    title: writeText(150),
    description: nullableString,
    maintenanceType: { type: 'string', enum: MAINTENANCE_TYPES },
    intervalDays: {
      type: 'integer',
      minimum: 0,
      description: '`0` indique un plan déclenché selon l’usure, sans échéance calendaire.',
    },
    lastMaintenanceDate: date,
    nextMaintenanceDate: nullableDate,
    priority: { type: 'string', enum: MAINTENANCE_PRIORITIES },
    active: { type: 'boolean' },
    notes: nullableString,
    material: {
      type: 'object',
      nullable: true,
      properties: { uuid, name: writeText(150) },
    },
    operation: { allOf: [reference('MaintenanceOperation')], nullable: true },
    parts: {
      type: 'array',
      items: {
        allOf: [
          reference('MaintenancePart'),
          {
            type: 'object',
            required: ['quantity'],
            properties: { quantity: decimalQuantity(100000) },
          },
        ],
      },
    },
    status: {
      type: 'string',
      enum: MAINTENANCE_DEADLINE_STATUSES,
    },
    remainingDays: { type: 'integer', nullable: true },
    ...timestamps,
  },
};

const maintenanceHistory = {
  type: 'object',
  required: ['uuid', 'performedAt', 'executionType'],
  properties: {
    uuid,
    performedAt: date,
    comment: nullableString,
    executionType: {
      type: 'string',
      enum: Object.values(MAINTENANCE_EXECUTION_TYPES),
    },
    partsSnapshot: {
      type: 'array',
      nullable: true,
      items: {
        type: 'object',
        required: ['uuid', 'name', 'reference', 'unit', 'quantity'],
        properties: {
          uuid,
          name: writeText(150),
          reference: writeText(150),
          unit: writeText(50),
          quantity: decimalQuantity(100000),
          unitPrice: { type: 'number', format: 'double', minimum: 0 },
          totalCost: { type: 'number', format: 'double', minimum: 0 },
          consumed: { type: 'boolean' },
        },
      },
    },
    performedByUser: {
      type: 'object',
      nullable: true,
      properties: {
        uuid,
        firstName: writeText(100),
        lastName: writeText(100),
      },
    },
    createdAt: dateTime,
  },
};

const auditLog = {
  type: 'object',
  required: ['uuid', 'action', 'entity'],
  properties: {
    uuid,
    action: writeText(100),
    entity: writeText(100),
    entityUuid: { ...uuid, nullable: true },
    oldValues: {
      type: 'object',
      nullable: true,
      description:
        'Valeurs métier avant l’action. Les identifiants techniques sont masqués et les relations fabricant/catégorie sont exposées par leur nom.',
      properties: {
        manufacturer: { type: 'string', nullable: true },
        category: { type: 'string', nullable: true },
        purchasePrice: { type: 'number', minimum: 0 },
      },
      additionalProperties: true,
    },
    newValues: {
      type: 'object',
      nullable: true,
      description:
        'Valeurs métier après l’action. Les identifiants techniques sont masqués et les relations fabricant/catégorie sont exposées par leur nom.',
      properties: {
        manufacturer: { type: 'string', nullable: true },
        category: { type: 'string', nullable: true },
        purchasePrice: { type: 'number', minimum: 0 },
      },
      additionalProperties: true,
    },
    createdAt: dateTime,
  },
};

const pagination = {
  type: 'object',
  required: ['page', 'limit', 'total', 'totalPages'],
  properties: {
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', enum: [5, 10, 25] },
    total: { type: 'integer', minimum: 0 },
    totalPages: { type: 'integer', minimum: 1 },
  },
};

const materialWriteProperties = {
  name: writeText(150),
  unit: writeText(50),
  purchasePrice: { type: 'number', minimum: 0 },
  manufacturerUuid: { ...uuid, nullable: true },
  categoryUuid: { ...uuid, nullable: true },
  model: { ...nullableString, maxLength: 150 },
  serialNumber: { ...nullableString, maxLength: 150 },
  purchaseDate: nullableDate,
  commissionedAt: nullableDate,
  retiredAt: nullableDate,
  notes: nullableString,
};

const maintenanceWriteProperties = {
  operationUuid: uuid,
  title: {
    ...writeText(150),
    deprecated: true,
    description: 'Compatibilité avec les anciens clients sans catalogue.',
  },
  description: nullableString,
  maintenanceType: {
    type: 'string',
    enum: MAINTENANCE_TYPES,
    deprecated: true,
    description: 'Déduit automatiquement de l’opération sélectionnée.',
  },
  intervalDays: {
    type: 'integer',
    minimum: 0,
    description: '`0` désactive le calcul calendaire et active le suivi selon l’usure.',
  },
  lastMaintenanceDate: date,
  priority: { type: 'string', enum: MAINTENANCE_PRIORITIES, default: 'normal' },
  notes: nullableString,
  parts: {
    type: 'array',
    maxItems: 50,
    items: {
      type: 'object',
      required: ['partUuid', 'quantity'],
      properties: {
        partUuid: uuid,
        quantity: decimalQuantity(100000),
      },
    },
  },
};

export const openApiSchemas = {
  ErrorResponse: {
    type: 'object',
    required: ['success', 'error'],
    properties: {
      success: { type: 'boolean', enum: [false] },
      error: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object', additionalProperties: true } },
        },
      },
    },
  },
  HealthResponse: {
    type: 'object',
    required: ['status', 'database', 'uptime', 'version', 'environment', 'timestamp'],
    properties: {
      status: { type: 'string', enum: ['UP', 'DOWN'] },
      database: { type: 'string', enum: ['UP', 'DOWN'] },
      uptime: { type: 'integer', minimum: 0 },
      version: { type: 'string' },
      environment: { type: 'string' },
      timestamp: dateTime,
    },
  },
  Pagination: pagination,
  Permission: permission,
  Role: role,
  Company: company,
  UserCompany: userCompany,
  UserRole: {
    type: 'object',
    required: ['uuid', 'name', 'permissions'],
    properties: {
      uuid,
      name: writeText(100),
      description: { ...nullableString, maxLength: 500 },
      permissions: arrayOf({
        type: 'object',
        required: ['name'],
        properties: { name: writeText(150) },
      }),
    },
  },
  User: user,
  Category: category,
  ManufacturerSummary: manufacturerSummary,
  Manufacturer: manufacturer,
  MaterialFile: materialFile,
  Material: material,
  MaterialOption: materialOption,
  AuditLog: auditLog,
  HistoryEvent: {
    type: 'object',
    required: ['uuid', 'occurredAt', 'recordedAt', 'type', 'action', 'subject', 'user', 'details'],
    properties: {
      uuid: { type: 'string' },
      occurredAt: {
        oneOf: [date, dateTime],
        description: 'Date métier de l’événement, ou date de journalisation pour un audit.',
      },
      recordedAt: {
        ...dateTime,
        description:
          'Horodatage exact de l’enregistrement, utilisé pour restituer l’heure et départager les événements d’une même date métier.',
      },
      type: {
        type: 'string',
        enum: [
          'material',
          'category',
          'manufacturer',
          'supplier',
          'maintenance_plan',
          'planned_execution',
          'unplanned_intervention',
          'maintenance_operation',
          'maintenance_part',
          'stock_movement',
          'price_change',
          'user',
          'role',
          'permission',
        ],
      },
      action: writeText(100),
      subject: {
        type: 'object',
        required: ['uuid', 'label'],
        properties: {
          uuid: { ...uuid, nullable: true },
          label: {
            type: 'string',
            description: 'Libellé métier résolu pour l’utilisateur, jamais un UUID technique.',
          },
        },
      },
      context: {
        type: 'object',
        nullable: true,
        required: ['uuid', 'label'],
        properties: { uuid, label: { type: 'string' } },
      },
      user: {
        type: 'object',
        nullable: true,
        required: ['uuid', 'firstName', 'lastName'],
        properties: {
          uuid,
          firstName: writeText(100),
          lastName: writeText(100),
          email: { type: 'string', format: 'email' },
        },
      },
      details: { type: 'object', additionalProperties: true },
    },
  },
  MaintenanceOperation: maintenanceOperation,
  Supplier: supplier,
  MaintenancePart: maintenancePart,
  StockMovement: {
    type: 'object',
    required: [
      'uuid',
      'operation',
      'quantityOnHandChange',
      'quantityOnOrderChange',
      'quantityOnHandAfter',
      'quantityOnOrderAfter',
      'performedAt',
      'createdAt',
    ],
    properties: {
      uuid,
      operation: { type: 'string', enum: STOCK_OPERATION_VALUES },
      quantityOnHandChange: { type: 'number', format: 'double', multipleOf: 0.01 },
      quantityOnOrderChange: { type: 'number', format: 'double', multipleOf: 0.01 },
      quantityOnHandAfter: decimalQuantity(1000000, { allowZero: true }),
      quantityOnOrderAfter: decimalQuantity(1000000, { allowZero: true }),
      sourceType: nullableString,
      sourceUuid: { ...uuid, nullable: true },
      performedAt: date,
      createdAt: dateTime,
    },
  },
  MaintenancePartPriceHistory: {
    type: 'object',
    required: ['uuid', 'previousUnitPrice', 'unitPrice', 'performedAt', 'createdAt'],
    properties: {
      uuid,
      previousUnitPrice: { type: 'number', format: 'double', minimum: 0 },
      unitPrice: { type: 'number', format: 'double', minimum: 0 },
      performedAt: date,
      changedByUser: {
        type: 'object',
        nullable: true,
        properties: {
          uuid,
          firstName: writeText(100),
          lastName: writeText(100),
        },
      },
      createdAt: dateTime,
    },
  },
  MaintenanceTask: maintenanceTask,
  MaintenanceSheet: {
    allOf: [
      reference('MaintenanceTask'),
      {
        type: 'object',
        properties: {
          material: {
            type: 'object',
            nullable: true,
            required: ['uuid', 'name', 'model', 'serialNumber'],
            properties: {
              uuid,
              name: writeText(150),
              model: { ...nullableString, maxLength: 150 },
              serialNumber: { ...nullableString, maxLength: 150 },
            },
          },
        },
      },
    ],
  },
  MaintenanceHistory: maintenanceHistory,
  MaintenanceInterventionPart: {
    type: 'object',
    required: [
      'uuid',
      'partUuid',
      'name',
      'reference',
      'unit',
      'quantity',
      'unitPrice',
      'totalCost',
    ],
    properties: {
      uuid,
      partUuid: uuid,
      name: writeText(150),
      reference: writeText(150),
      unit: writeText(50),
      quantity: decimalQuantity(),
      unitPrice: { type: 'number', format: 'double', minimum: 0 },
      totalCost: { type: 'number', format: 'double', minimum: 0 },
    },
  },
  MaintenanceIntervention: {
    type: 'object',
    required: ['uuid', 'material', 'description', 'performedAt', 'parts', 'totalCost', 'createdAt'],
    properties: {
      uuid,
      material: {
        type: 'object',
        nullable: true,
        properties: { uuid, name: writeText(150) },
      },
      description: writeText(2000),
      performedAt: date,
      performedByUser: {
        type: 'object',
        nullable: true,
        properties: { uuid, firstName: writeText(100), lastName: writeText(100) },
      },
      parts: arrayOf(reference('MaintenanceInterventionPart')),
      totalCost: { type: 'number', format: 'double', minimum: 0 },
      createdAt: dateTime,
    },
  },
  RegisterRequest: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'password'],
    properties: {
      firstName: writeText(100),
      lastName: {
        ...writeText(100),
        description: 'Nom de famille normalisé en majuscules par le serveur.',
      },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password', minLength: 8, writeOnly: true },
    },
  },
  VerifyEmailRequest: {
    type: 'object',
    required: ['token'],
    additionalProperties: false,
    properties: { token: { type: 'string', minLength: 40, maxLength: 200, writeOnly: true } },
  },
  ResendEmailVerificationRequest: {
    type: 'object',
    required: ['email'],
    additionalProperties: false,
    properties: { email: { type: 'string', format: 'email' } },
  },
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password', writeOnly: true },
    },
  },
  UserCreateRequest: {
    allOf: [
      reference('RegisterRequest'),
      {
        type: 'object',
        properties: {
          roleUuids: {
            ...arrayOf(uuid),
            description: 'Nécessite `users.roles.update`.',
          },
          companyUuids: {
            ...arrayOf(uuid),
            description: 'Nécessite `users.companies.update`.',
          },
        },
      },
    ],
  },
  UserUpdateRequest: {
    type: 'object',
    properties: {
      firstName: writeText(100),
      lastName: {
        ...writeText(100),
        description: 'Nom de famille normalisé en majuscules par le serveur.',
      },
      email: { type: 'string', format: 'email' },
      password: {
        type: 'string',
        format: 'password',
        minLength: 8,
        writeOnly: true,
        description: 'Nécessite `users.password.update`.',
      },
      isActive: { type: 'boolean', description: 'Nécessite `users.status.update`.' },
      roleUuids: {
        ...arrayOf(uuid),
        description: 'Nécessite `users.roles.update`.',
      },
      companyUuids: {
        ...arrayOf(uuid),
        description: 'Nécessite `users.companies.update`.',
      },
    },
  },
  RoleCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: writeText(100),
      description: { type: 'string', maxLength: 500 },
      permissionUuids: {
        ...arrayOf(uuid),
        description: 'Nécessite `roles.permissions.update`.',
      },
    },
  },
  RoleUpdateRequest: {
    type: 'object',
    properties: {
      description: { type: 'string', maxLength: 500 },
      permissionUuids: {
        ...arrayOf(uuid),
        description: 'Nécessite `roles.permissions.update`.',
      },
    },
  },
  PermissionCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: writeText(150),
      description: { type: 'string', maxLength: 500 },
    },
  },
  PermissionUpdateRequest: {
    type: 'object',
    properties: {
      name: writeText(150),
      description: { type: 'string', maxLength: 500 },
    },
  },
  CategoryCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: { name: writeText(150), description: { type: 'string' } },
  },
  CategoryUpdateRequest: {
    type: 'object',
    properties: {
      name: writeText(150),
      description: { type: 'string' },
      active: { type: 'boolean', description: 'Nécessite `categories.status.update`.' },
    },
  },
  ManufacturerCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: { name: writeText(150) },
  },
  ManufacturerUpdateRequest: {
    type: 'object',
    properties: {
      name: writeText(150),
      active: { type: 'boolean', description: 'Nécessite `manufacturers.status.update`.' },
    },
  },
  MaterialCreateRequest: {
    type: 'object',
    required: ['name', 'unit', 'purchasePrice'],
    properties: materialWriteProperties,
  },
  MaterialUpdateRequest: {
    type: 'object',
    properties: {
      ...materialWriteProperties,
      active: {
        type: 'boolean',
        description:
          'Nécessite `materials.status.update`. Désactiver le matériel désactive ses plans actifs. Le réactiver ne réactive que les plans désactivés par le même changement de statut.',
      },
    },
  },
  MaintenanceCreateRequest: {
    type: 'object',
    required: ['materialUuid', 'intervalDays', 'lastMaintenanceDate'],
    oneOf: [
      { required: ['operationUuid'] },
      {
        required: ['title', 'maintenanceType'],
        description: 'Payload historique conservé pour compatibilité.',
      },
    ],
    properties: { materialUuid: uuid, ...maintenanceWriteProperties },
  },
  MaintenanceUpdateRequest: {
    type: 'object',
    properties: maintenanceWriteProperties,
  },
  MaintenanceStatusRequest: {
    type: 'object',
    required: ['active'],
    properties: {
      active: {
        type: 'boolean',
        description:
          'Nécessite `maintenance.status.update`. Un plan ne peut pas être activé si son matériel est inactif.',
      },
    },
  },
  MaintenanceExecuteRequest: {
    type: 'object',
    properties: {
      performedAt: date,
      comment: {
        type: 'string',
        description: 'Obligatoire lorsque `partsAction` vaut `partial` ou `skip`.',
      },
      partsAction: {
        type: 'string',
        enum: Object.values(MAINTENANCE_PART_ACTIONS),
        default: MAINTENANCE_PART_ACTIONS.CONSUME,
        description:
          '`consume` retire toutes les pièces prévues du stock. `partial` retire uniquement les pièces de `partUuids`. `partial` et `skip` nécessitent `maintenance.execute.skip_parts` et enregistrent explicitement les pièces non remplacées.',
      },
      partUuids: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        uniqueItems: true,
        items: uuid,
        description:
          'Identifiants des pièces réellement remplacées. Requis uniquement avec `partsAction=partial` et doit constituer un sous-ensemble strict des pièces du plan.',
      },
    },
  },
  MaintenanceInterventionCreateRequest: {
    type: 'object',
    required: ['materialUuid', 'description', 'parts'],
    properties: {
      materialUuid: uuid,
      description: writeText(2000),
      performedAt: date,
      parts: {
        type: 'array',
        minItems: 1,
        maxItems: 50,
        items: {
          type: 'object',
          required: ['partUuid', 'quantity'],
          properties: {
            partUuid: uuid,
            quantity: decimalQuantity(),
          },
        },
      },
    },
  },
  MaintenanceOperationCreateRequest: {
    type: 'object',
    required: ['name', 'maintenanceType'],
    properties: {
      name: writeText(150),
      description: nullableString,
      maintenanceType: { type: 'string', enum: MAINTENANCE_TYPES },
    },
  },
  MaintenanceOperationUpdateRequest: {
    type: 'object',
    properties: {
      name: writeText(150),
      description: nullableString,
      maintenanceType: { type: 'string', enum: MAINTENANCE_TYPES },
      active: {
        type: 'boolean',
        description: 'Nécessite `maintenance.operations.status.update`.',
      },
    },
  },
  MaintenancePartCreateRequest: {
    type: 'object',
    required: ['name', 'reference'],
    properties: {
      name: writeText(150),
      manufacturer: {
        ...nullableString,
        maxLength: 150,
        deprecated: true,
        description: 'Ancien champ texte conservé pour compatibilité.',
      },
      manufacturerUuid: { ...uuid, nullable: true },
      supplierUuid: { ...uuid, nullable: true },
      reference: writeText(150),
      supplierReference: { ...nullableString, maxLength: 150 },
      unit: { ...writeText(50), default: 'pièce' },
      unitPrice: {
        type: 'number',
        format: 'double',
        minimum: 0,
        maximum: MAX_UNIT_PRICE,
        default: 0,
        description: 'Prix unitaire initial en euros. Les changements ultérieurs sont historisés.',
      },
    },
  },
  MaintenancePartUpdateRequest: {
    type: 'object',
    properties: {
      name: writeText(150),
      manufacturer: {
        ...nullableString,
        maxLength: 150,
        deprecated: true,
        description: 'Ancien champ texte conservé pour compatibilité.',
      },
      manufacturerUuid: { ...uuid, nullable: true },
      supplierUuid: { ...uuid, nullable: true },
      reference: writeText(150),
      supplierReference: { ...nullableString, maxLength: 150 },
      unit: writeText(50),
      active: { type: 'boolean', description: 'Nécessite `maintenance.parts.status.update`.' },
    },
  },
  MaintenancePartStockRequest: {
    oneOf: [
      {
        type: 'object',
        required: ['operation'],
        properties: {
          operation: { type: 'string', enum: [STOCK_OPERATIONS.ADJUST] },
          performedAt: date,
          quantityOnHand: decimalQuantity(1000000, { allowZero: true }),
          quantityOnOrder: decimalQuantity(1000000, { allowZero: true }),
        },
        anyOf: [{ required: ['quantityOnHand'] }, { required: ['quantityOnOrder'] }],
        additionalProperties: false,
      },
      {
        type: 'object',
        required: ['operation', 'quantity'],
        properties: {
          operation: {
            type: 'string',
            enum: [STOCK_OPERATIONS.ORDER, STOCK_OPERATIONS.RECEIVE],
          },
          performedAt: date,
          quantity: decimalQuantity(),
        },
        additionalProperties: false,
      },
      {
        type: 'object',
        deprecated: true,
        required: ['stockStatus', 'stockQuantity'],
        properties: {
          stockStatus: { type: 'string', enum: STOCK_STATUS_VALUES },
          stockQuantity: decimalQuantity(1000000, { allowZero: true }),
          performedAt: date,
        },
        additionalProperties: false,
      },
    ],
  },
  MaintenancePartPriceRequest: {
    type: 'object',
    required: ['unitPrice'],
    additionalProperties: false,
    properties: {
      unitPrice: { type: 'number', format: 'double', minimum: 0, maximum: MAX_UNIT_PRICE },
      performedAt: date,
    },
  },
  MaintenancePartMinimumStockRequest: {
    type: 'object',
    required: ['minimumStockQuantity'],
    additionalProperties: false,
    properties: {
      minimumStockQuantity: decimalQuantity(1000000, { allowZero: true }),
    },
  },
  StockMovementPage: {
    type: 'object',
    required: ['items', 'pagination'],
    properties: {
      items: arrayOf(reference('StockMovement')),
      pagination: reference('Pagination'),
    },
  },
  MaintenancePartPriceHistoryPage: {
    type: 'object',
    required: ['items', 'pagination'],
    properties: {
      items: arrayOf(reference('MaintenancePartPriceHistory')),
      pagination: reference('Pagination'),
    },
  },
  MaintenanceInterventionPage: {
    type: 'object',
    required: ['items', 'pagination'],
    properties: {
      items: arrayOf(reference('MaintenanceIntervention')),
      pagination: reference('Pagination'),
    },
  },
  SupplierCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: writeText(150),
      contactName: { ...nullableString, maxLength: 150 },
      email: { type: 'string', format: 'email', nullable: true, maxLength: 254 },
      phone: { ...nullableString, maxLength: 50 },
      notes: nullableString,
    },
  },
  SupplierUpdateRequest: {
    type: 'object',
    properties: {
      name: writeText(150),
      contactName: { ...nullableString, maxLength: 150 },
      email: { type: 'string', format: 'email', nullable: true, maxLength: 254 },
      phone: { ...nullableString, maxLength: 50 },
      notes: nullableString,
      active: { type: 'boolean', description: 'Nécessite `suppliers.status.update`.' },
    },
  },
  CompanyCreateRequest: {
    type: 'object',
    required: ['name'],
    additionalProperties: false,
    properties: {
      name: writeText(150),
      description: { ...nullableString, maxLength: 1000 },
    },
  },
  CompanyUpdateRequest: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: writeText(150),
      description: { ...nullableString, maxLength: 1000 },
      active: {
        type: 'boolean',
        description: 'Nécessite `companies.status.update`.',
      },
    },
  },
  AuthSession: {
    type: 'object',
    required: ['accessToken', 'user'],
    properties: {
      accessToken: { type: 'string', description: 'JWT access token.' },
      user: {
        type: 'object',
        required: ['uuid', 'firstName', 'lastName', 'email', 'roles', 'permissions', 'companies'],
        properties: {
          uuid,
          firstName: writeText(100),
          lastName: writeText(100),
          email: { type: 'string', format: 'email' },
          roles: arrayOf({ type: 'string' }),
          permissions: arrayOf({ type: 'string' }),
          companies: arrayOf(reference('UserCompany')),
        },
      },
    },
  },
  UserPage: pageOf('User'),
  CompanyPage: pageOf('Company'),
  RolePage: pageOf('Role'),
  PermissionPage: pageOf('Permission'),
  CategoryPage: pageOf('Category'),
  ManufacturerPage: pageOf('Manufacturer'),
  SupplierPage: pageOf('Supplier'),
  MaterialPage: pageOf('Material'),
  MaterialOptionPage: pageOf('MaterialOption'),
  AuditLogPage: pageOf('AuditLog'),
  HistoryEventPage: pageOf('HistoryEvent'),
  MaintenancePage: pageOf('MaintenanceTask'),
  MaintenanceOperationPage: pageOf('MaintenanceOperation'),
  MaintenancePartPage: pageOf('MaintenancePart'),
  MaintenanceHistoryPage: pageOf('MaintenanceHistory'),
  MaintenanceExecution: {
    type: 'object',
    required: ['task', 'history'],
    properties: {
      task: reference('MaintenanceTask'),
      history: reference('MaintenanceHistory'),
    },
  },
  MaintenanceOrderList: {
    type: 'object',
    required: [
      'status',
      'horizonDays',
      'includeOverdue',
      'includeWearBased',
      'includeLowStock',
      'lowStockOnly',
      'from',
      'through',
      'items',
    ],
    properties: {
      status: {
        type: 'string',
        enum: MAINTENANCE_DEADLINE_STATUSES,
        nullable: true,
      },
      horizonDays: { type: 'integer', minimum: 0, maximum: 365 },
      includeOverdue: { type: 'boolean' },
      includeWearBased: { type: 'boolean' },
      includeLowStock: { type: 'boolean' },
      lowStockOnly: { type: 'boolean' },
      from: date,
      through: date,
      items: {
        type: 'array',
        items: {
          allOf: [
            reference('MaintenancePart'),
            {
              type: 'object',
              required: ['quantity', 'lowStock', 'plans'],
              properties: {
                quantity: {
                  ...decimalQuantity(1000000, { allowZero: true }),
                  description:
                    'Quantité restant à commander après déduction du stock ou de la commande en cours. Peut valoir zéro dans la vue exhaustive du stock faible.',
                },
                lowStock: {
                  type: 'boolean',
                  description:
                    'Indique que le stock disponible de la pièce est inférieur ou égal à son stock minimum.',
                },
                plans: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: [
                      'maintenanceUuid',
                      'title',
                      'nextMaintenanceDate',
                      'wearBased',
                      'quantity',
                    ],
                    properties: {
                      maintenanceUuid: uuid,
                      title: writeText(150),
                      material: {
                        type: 'object',
                        nullable: true,
                        properties: { uuid, name: writeText(150) },
                      },
                      nextMaintenanceDate: nullableDate,
                      wearBased: { type: 'boolean' },
                      quantity: decimalQuantity(100000),
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
  MaintenanceSheetList: {
    type: 'object',
    required: ['status', 'includeOverdue', 'includeWearBased', 'items'],
    properties: {
      status: {
        type: 'string',
        enum: MAINTENANCE_DEADLINE_STATUSES,
        nullable: true,
      },
      includeOverdue: { type: 'boolean' },
      includeWearBased: { type: 'boolean' },
      items: arrayOf(reference('MaintenanceSheet')),
    },
  },
  DashboardSummary: {
    type: 'object',
    required: ['materials', 'categories', 'manufacturers', 'fleet'],
    properties: {
      materials: {
        type: 'object',
        required: ['total', 'active', 'inactive'],
        properties: {
          total: { type: 'integer', minimum: 0 },
          active: { type: 'integer', minimum: 0 },
          inactive: { type: 'integer', minimum: 0 },
        },
      },
      categories: {
        type: 'object',
        required: ['total'],
        properties: { total: { type: 'integer', minimum: 0 } },
      },
      manufacturers: {
        type: 'object',
        required: ['total'],
        properties: { total: { type: 'integer', minimum: 0 } },
      },
      fleet: {
        type: 'object',
        required: ['averageAge'],
        properties: {
          totalPurchaseValue: {
            type: 'number',
            description: 'Présent uniquement avec `dashboard.read.financial`.',
          },
          averageCost: {
            type: 'number',
            description: 'Présent uniquement avec `dashboard.read.financial`.',
          },
          averageAge: { type: 'number' },
        },
      },
      maintenance: {
        type: 'object',
        description:
          'Présent lorsqu’au moins un indicateur de maintenance est autorisé. Les échéances nécessitent `maintenance.read` et le stock faible nécessite `maintenance.parts.read`.',
        properties: {
          today: { type: 'integer', minimum: 0 },
          overdue: { type: 'integer', minimum: 0 },
          upcoming: { type: 'integer', minimum: 0 },
          wearBased: { type: 'integer', minimum: 0 },
          lowStock: {
            type: 'integer',
            minimum: 0,
            description:
              'Présent uniquement avec `maintenance.parts.read`. Nombre de pièces de maintenance actives dont le stock disponible est inférieur ou égal à leur stock minimum.',
          },
          stockValues: {
            type: 'object',
            description:
              'Présent uniquement avec `dashboard.read.financial`. Valorisation au prix unitaire courant des quantités réellement en stock et commandées.',
            required: ['onHand', 'onOrder'],
            properties: {
              onHand: { type: 'number', format: 'double', minimum: 0 },
              onOrder: { type: 'number', format: 'double', minimum: 0 },
            },
          },
          costs: {
            type: 'array',
            description: 'Présent uniquement avec `dashboard.read.financial`.',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              required: ['year', 'total'],
              properties: {
                year: { type: 'integer', minimum: 2000 },
                total: { type: 'number', format: 'double', minimum: 0 },
              },
            },
          },
          items: {
            type: 'object',
            required: ['today', 'overdue', 'upcoming', 'wearBased'],
            properties: {
              today: arrayOf(reference('MaintenanceTask')),
              overdue: arrayOf(reference('MaintenanceTask')),
              upcoming: arrayOf(reference('MaintenanceTask')),
              wearBased: arrayOf(reference('MaintenanceTask')),
            },
          },
        },
      },
    },
  },
  RelationGraphNode: {
    type: 'object',
    required: ['id', 'label', 'kind'],
    properties: {
      id: { type: 'string' },
      label: {
        type: 'string',
        description: 'Libellé structurel, vide pour les relations entre enregistrements réels.',
      },
      description: { type: 'string' },
      kind: { type: 'string', enum: ['company', 'domain', 'entity', 'technical'] },
      count: { type: 'integer', minimum: 0 },
      recordType: {
        type: 'string',
        description: 'Type métier de l’enregistrement lorsque le scope vaut `records`.',
      },
      path: {
        type: 'string',
        description: 'Route frontend autorisée ouverte depuis le nœud.',
      },
    },
  },
  RelationGraphEdge: {
    type: 'object',
    required: ['id', 'source', 'target', 'label', 'kind'],
    properties: {
      id: { type: 'string' },
      source: { type: 'string' },
      target: { type: 'string' },
      label: { type: 'string' },
      kind: { type: 'string', enum: ['group', 'direct', 'association', 'derived'] },
      hierarchy: {
        type: 'boolean',
        description: 'Indique que la relation participe au dépliage de la hiérarchie.',
      },
      layout: {
        type: 'boolean',
        description: 'Indique que la relation influence la disposition des nœuds.',
      },
    },
  },
  RelationGraph: {
    type: 'object',
    required: ['scope', 'mode', 'company', 'nodes', 'edges'],
    properties: {
      scope: { type: 'string', enum: ['models', 'records'] },
      mode: { type: 'string', enum: ['simplified', 'complete'] },
      company: {
        type: 'object',
        nullable: true,
        required: ['uuid', 'name'],
        properties: { uuid, name: writeText(150) },
      },
      nodes: arrayOf(reference('RelationGraphNode')),
      edges: arrayOf(reference('RelationGraphEdge')),
    },
  },
  ApiEntryResponse: success({
    type: 'object',
    required: ['name', 'version'],
    properties: { name: { type: 'string' }, version: { type: 'string' } },
  }),
  AuthSessionResponse: success(reference('AuthSession')),
  RegistrationResponse: success({
    type: 'object',
    required: [
      'user',
      'verificationRequired',
      'verificationEmailSent',
      'verificationEmailResendCooldownSeconds',
    ],
    properties: {
      user: reference('User'),
      verificationRequired: { type: 'boolean', enum: [true] },
      verificationEmailSent: {
        type: 'boolean',
        description:
          'Indique si le premier email a été remis au transport SMTP. Le compte reste créé en cas d’échec.',
      },
      verificationEmailResendCooldownSeconds: {
        type: 'integer',
        minimum: 0,
        description:
          'Délai avant le premier renvoi. Vaut zéro lorsque le premier email n’a pas été envoyé.',
      },
    },
  }),
  EmailVerificationResponse: success({
    type: 'object',
    required: ['message', 'resendCooldownSeconds'],
    properties: {
      message: { type: 'string' },
      resendCooldownSeconds: {
        type: 'integer',
        minimum: 1,
        description: 'Délai avant qu’un nouveau renvoi puisse être demandé.',
      },
    },
  }),
  LogoutResponse: success({
    type: 'object',
    required: ['message'],
    properties: { message: { type: 'string' } },
  }),
  UserResponse: success(reference('User')),
  UserListResponse: success(reference('UserPage')),
  CompanyResponse: success(reference('Company')),
  CompanyListResponse: success(reference('CompanyPage')),
  RoleResponse: success(reference('Role')),
  RoleListResponse: success(reference('RolePage')),
  PermissionResponse: success(reference('Permission')),
  PermissionListResponse: success(reference('PermissionPage')),
  CategoryResponse: success(reference('Category')),
  CategoryListResponse: success(reference('CategoryPage')),
  ManufacturerResponse: success(reference('Manufacturer')),
  ManufacturerListResponse: success(reference('ManufacturerPage')),
  LogoStatusResponse: success({
    type: 'object',
    required: ['hasLogo'],
    properties: { hasLogo: { type: 'boolean' } },
  }),
  MaterialResponse: success(reference('Material')),
  MaterialListResponse: success(reference('MaterialPage')),
  MaterialOptionListResponse: success(reference('MaterialOptionPage')),
  MaterialFileResponse: success(reference('MaterialFile')),
  AuditLogListResponse: success(reference('AuditLogPage')),
  HistoryEventListResponse: success(reference('HistoryEventPage')),
  MaintenanceResponse: success(reference('MaintenanceTask')),
  MaintenanceListResponse: success(reference('MaintenancePage')),
  MaintenanceOperationResponse: success(reference('MaintenanceOperation')),
  MaintenanceOperationListResponse: success(reference('MaintenanceOperationPage')),
  SupplierResponse: success(reference('Supplier')),
  SupplierListResponse: success(reference('SupplierPage')),
  MaintenancePartResponse: success(reference('MaintenancePart')),
  MaintenancePartListResponse: success(reference('MaintenancePartPage')),
  StockMovementListResponse: success(reference('StockMovementPage')),
  MaintenancePartPriceHistoryListResponse: success(reference('MaintenancePartPriceHistoryPage')),
  MaintenanceOrderListResponse: success(reference('MaintenanceOrderList')),
  MaintenanceSheetListResponse: success(reference('MaintenanceSheetList')),
  MaintenanceHistoryResponse: success(reference('MaintenanceHistoryPage')),
  MaintenanceExecutionResponse: success(reference('MaintenanceExecution')),
  MaintenanceInterventionResponse: success(reference('MaintenanceIntervention')),
  MaintenanceInterventionListResponse: success(reference('MaintenanceInterventionPage')),
  DashboardResponse: success(reference('DashboardSummary')),
  RelationGraphResponse: success(reference('RelationGraph')),
};

export const openApiResponses = {
  BadRequest: withCacheControl({
    description: 'Invalid request.',
    content: { 'application/json': { schema: reference('ErrorResponse') } },
  }),
  Unauthorized: withCacheControl({
    description: 'Authentication is required or the token is invalid.',
    content: { 'application/json': { schema: reference('ErrorResponse') } },
  }),
  Forbidden: withCacheControl({
    description: 'The authenticated user lacks the required role or permission.',
    content: { 'application/json': { schema: reference('ErrorResponse') } },
  }),
  NotFound: withCacheControl({
    description: 'The requested resource was not found.',
    content: { 'application/json': { schema: reference('ErrorResponse') } },
  }),
  Conflict: withCacheControl({
    description: 'The request conflicts with an existing resource.',
    content: { 'application/json': { schema: reference('ErrorResponse') } },
  }),
  TooManyRequests: withCacheControl({
    description: 'The request quota has been exceeded. Retry after the indicated delay.',
    headers: {
      'Retry-After': { $ref: '#/components/headers/RetryAfter' },
      RateLimit: { $ref: '#/components/headers/RateLimit' },
      'RateLimit-Policy': { $ref: '#/components/headers/RateLimitPolicy' },
    },
    content: { 'application/json': { schema: reference('ErrorResponse') } },
  }),
  InternalError: withCacheControl({
    description: 'Unexpected server error.',
    content: { 'application/json': { schema: reference('ErrorResponse') } },
  }),
  ServiceUnavailable: withCacheControl({
    description: 'The configured email delivery service is unavailable.',
    content: { 'application/json': { schema: reference('ErrorResponse') } },
  }),
};

export const openApiHeaders = {
  CacheControl: {
    description:
      'Politique de cache dépendant de l’environnement, de la sensibilité et du type de ressource.',
    schema: {
      type: 'string',
      example: 'private, no-cache',
    },
  },
  RetryAfter: {
    description: 'Nombre de secondes avant une nouvelle tentative.',
    schema: { type: 'integer', minimum: 1 },
  },
  RateLimit: {
    description: 'Quota restant et délai de réinitialisation au format IETF draft-8.',
    schema: { type: 'string' },
  },
  RateLimitPolicy: {
    description: 'Politique de quota appliquée à la requête.',
    schema: { type: 'string' },
  },
};

export const openApiParameters = {
  CompanyUuidHeader: {
    name: 'X-Company-Uuid',
    in: 'header',
    required: false,
    description:
      'Société active. Obligatoire pour sélectionner une société autre que la première société accessible.',
    schema: uuid,
  },
  Uuid: {
    name: 'uuid',
    in: 'path',
    required: true,
    description: 'Public resource UUID.',
    schema: uuid,
  },
  FileUuid: {
    name: 'fileUuid',
    in: 'path',
    required: true,
    description: 'Public file UUID.',
    schema: uuid,
  },
};
