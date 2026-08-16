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
    name: writeText(100),
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

const user = {
  type: 'object',
  required: ['uuid', 'firstName', 'lastName', 'email', 'isActive', 'roles'],
  properties: {
    id: { type: 'integer', readOnly: true },
    uuid,
    firstName: { type: 'string', maxLength: 100 },
    lastName: { type: 'string', maxLength: 100 },
    email: { type: 'string', format: 'email', maxLength: 255 },
    isActive: { type: 'boolean' },
    lastLoginAt: nullableDateTime,
    roles: arrayOf(reference('UserRole')),
    ...timestamps,
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
    stockStatus: { type: 'string', enum: STOCK_STATUS_VALUES },
    stockQuantity: {
      type: 'integer',
      minimum: 0,
      maximum: 2000000,
      deprecated: true,
      description: 'Somme de compatibilité. Utiliser les deux quantités détaillées.',
    },
    quantityOnHand: { type: 'integer', minimum: 0, maximum: 1000000 },
    quantityOnOrder: { type: 'integer', minimum: 0, maximum: 1000000 },
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
            properties: { quantity: { type: 'integer', minimum: 1 } },
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
          quantity: { type: 'integer', minimum: 1, maximum: 100000 },
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
        quantity: { type: 'integer', minimum: 1, maximum: 100000 },
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
        properties: { name: writeText(100) },
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
      'createdAt',
    ],
    properties: {
      uuid,
      operation: { type: 'string', enum: STOCK_OPERATION_VALUES },
      quantityOnHandChange: { type: 'integer' },
      quantityOnOrderChange: { type: 'integer' },
      quantityOnHandAfter: { type: 'integer', minimum: 0, maximum: 1000000 },
      quantityOnOrderAfter: { type: 'integer', minimum: 0, maximum: 1000000 },
      sourceType: nullableString,
      sourceUuid: { ...uuid, nullable: true },
      createdAt: dateTime,
    },
  },
  MaintenancePartPriceHistory: {
    type: 'object',
    required: ['uuid', 'previousUnitPrice', 'unitPrice', 'createdAt'],
    properties: {
      uuid,
      previousUnitPrice: { type: 'number', format: 'double', minimum: 0 },
      unitPrice: { type: 'number', format: 'double', minimum: 0 },
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
  MaintenanceHistory: maintenanceHistory,
  RegisterRequest: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'password'],
    properties: {
      firstName: writeText(100),
      lastName: writeText(100),
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password', minLength: 8, writeOnly: true },
    },
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
        properties: { roleUuids: arrayOf(uuid) },
      },
    ],
  },
  UserUpdateRequest: {
    type: 'object',
    properties: {
      firstName: writeText(100),
      lastName: writeText(100),
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password', minLength: 8, writeOnly: true },
      isActive: { type: 'boolean' },
      roleUuids: arrayOf(uuid),
    },
  },
  RoleCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: writeText(100),
      description: { type: 'string', maxLength: 500 },
      permissionUuids: arrayOf(uuid),
    },
  },
  RoleUpdateRequest: {
    type: 'object',
    properties: {
      name: writeText(100),
      description: { type: 'string', maxLength: 500 },
      permissionUuids: arrayOf(uuid),
    },
  },
  PermissionCreateRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: writeText(100),
      description: { type: 'string', maxLength: 500 },
    },
  },
  PermissionUpdateRequest: {
    type: 'object',
    properties: {
      name: writeText(100),
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
      active: { type: 'boolean' },
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
      active: { type: 'boolean' },
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
          'Désactiver le matériel désactive ses plans actifs. Le réactiver ne réactive que les plans désactivés par le même changement de statut.',
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
        description: 'Un plan ne peut pas être activé si son matériel est inactif.',
      },
    },
  },
  MaintenanceExecuteRequest: {
    type: 'object',
    properties: {
      performedAt: date,
      comment: {
        type: 'string',
        description: 'Obligatoire lorsque `partsAction` vaut `skip`.',
      },
      partsAction: {
        type: 'string',
        enum: Object.values(MAINTENANCE_PART_ACTIONS),
        default: MAINTENANCE_PART_ACTIONS.CONSUME,
        description:
          '`consume` retire les pièces du stock. `skip` nécessite `maintenance.execute.skip_parts` et enregistre explicitement leur non-remplacement.',
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
      active: { type: 'boolean' },
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
      active: { type: 'boolean' },
    },
  },
  MaintenancePartStockRequest: {
    oneOf: [
      {
        type: 'object',
        required: ['operation'],
        properties: {
          operation: { type: 'string', enum: [STOCK_OPERATIONS.ADJUST] },
          quantityOnHand: { type: 'integer', minimum: 0, maximum: 1000000 },
          quantityOnOrder: { type: 'integer', minimum: 0, maximum: 1000000 },
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
          quantity: { type: 'integer', minimum: 1, maximum: 1000000 },
        },
        additionalProperties: false,
      },
      {
        type: 'object',
        deprecated: true,
        required: ['stockStatus', 'stockQuantity'],
        properties: {
          stockStatus: { type: 'string', enum: STOCK_STATUS_VALUES },
          stockQuantity: { type: 'integer', minimum: 0, maximum: 1000000 },
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
      active: { type: 'boolean' },
    },
  },
  AuthSession: {
    type: 'object',
    required: ['accessToken', 'user'],
    properties: {
      accessToken: { type: 'string', description: 'JWT access token.' },
      user: {
        type: 'object',
        required: ['uuid', 'firstName', 'lastName', 'email', 'roles', 'permissions'],
        properties: {
          uuid,
          firstName: writeText(100),
          lastName: writeText(100),
          email: { type: 'string', format: 'email' },
          roles: arrayOf({ type: 'string' }),
          permissions: arrayOf({ type: 'string' }),
        },
      },
    },
  },
  UserPage: pageOf('User'),
  RolePage: pageOf('Role'),
  PermissionPage: pageOf('Permission'),
  CategoryPage: pageOf('Category'),
  ManufacturerPage: pageOf('Manufacturer'),
  SupplierPage: pageOf('Supplier'),
  MaterialPage: pageOf('Material'),
  MaterialOptionPage: pageOf('MaterialOption'),
  AuditLogPage: pageOf('AuditLog'),
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
      from: date,
      through: date,
      items: {
        type: 'array',
        items: {
          allOf: [
            reference('MaintenancePart'),
            {
              type: 'object',
              required: ['quantity', 'plans'],
              properties: {
                quantity: {
                  type: 'integer',
                  minimum: 1,
                  description:
                    'Quantité restant à commander après déduction du stock ou de la commande en cours.',
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
                      quantity: { type: 'integer', minimum: 1 },
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
        required: ['totalPurchaseValue', 'averageCost', 'averageAge'],
        properties: {
          totalPurchaseValue: { type: 'number' },
          averageCost: { type: 'number' },
          averageAge: { type: 'number' },
        },
      },
      maintenance: {
        type: 'object',
        description: 'Présent uniquement lorsque l’utilisateur possède `maintenance.read`.',
        required: ['today', 'overdue', 'upcoming', 'wearBased', 'costs', 'items'],
        properties: {
          today: { type: 'integer', minimum: 0 },
          overdue: { type: 'integer', minimum: 0 },
          upcoming: { type: 'integer', minimum: 0 },
          wearBased: { type: 'integer', minimum: 0 },
          costs: {
            type: 'array',
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
  ApiEntryResponse: success({
    type: 'object',
    required: ['name', 'version'],
    properties: { name: { type: 'string' }, version: { type: 'string' } },
  }),
  AuthSessionResponse: success(reference('AuthSession')),
  LogoutResponse: success({
    type: 'object',
    required: ['message'],
    properties: { message: { type: 'string' } },
  }),
  UserResponse: success(reference('User')),
  UserListResponse: success(reference('UserPage')),
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
  MaintenanceHistoryResponse: success(reference('MaintenanceHistoryPage')),
  MaintenanceExecutionResponse: success(reference('MaintenanceExecution')),
  DashboardResponse: success(reference('DashboardSummary')),
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
