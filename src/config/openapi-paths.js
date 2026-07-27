const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });
const parameterRef = (name) => ({ $ref: `#/components/parameters/${name}` });
const jsonBody = (schemaName, required = true) => ({
  required,
  content: { 'application/json': { schema: schemaRef(schemaName) } },
});
const jsonResponse = (schemaName, description) => ({
  description,
  content: { 'application/json': { schema: schemaRef(schemaName) } },
});
const binaryResponse = (description, contentTypes) => ({
  description,
  content: Object.fromEntries(
    contentTypes.map((contentType) => [
      contentType,
      { schema: { type: 'string', format: 'binary' } },
    ]),
  ),
});
const noContent = { description: 'Operation completed successfully; no response body.' };
const secure = [{ bearerAuth: [] }];
const standardErrors = {
  400: responseRef('BadRequest'),
  401: responseRef('Unauthorized'),
  403: responseRef('Forbidden'),
  500: responseRef('InternalError'),
};
const resourceErrors = {
  ...standardErrors,
  404: responseRef('NotFound'),
};
const writeErrors = {
  ...resourceErrors,
  409: responseRef('Conflict'),
};
const uuidParameter = parameterRef('Uuid');
const fileUuidParameter = parameterRef('FileUuid');
const searchParameter = {
  name: 'search',
  in: 'query',
  required: false,
  schema: { type: 'string', maxLength: 150 },
};
const pageParameter = {
  name: 'page',
  in: 'query',
  required: false,
  schema: { type: 'integer', minimum: 1, default: 1 },
};
const limitParameter = {
  name: 'limit',
  in: 'query',
  required: false,
  description: 'Nombre de résultats (1 à 100), ou `all` pour tous les résultats.',
  schema: {
    oneOf: [
      { type: 'integer', minimum: 1, maximum: 100 },
      { type: 'string', enum: ['all'] },
    ],
    default: 5,
  },
};

export const openApiPaths = {
  '/': {
    get: {
      operationId: 'getApiEntry',
      tags: ['System'],
      summary: 'Retourne l’identité et la version de l’API.',
      responses: {
        200: jsonResponse('ApiEntryResponse', 'Point d’entrée retourné.'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/health': {
    get: {
      operationId: 'getHealth',
      tags: ['System'],
      summary: 'Contrôle la disponibilité de l’API et de la base de données.',
      servers: [{ url: '/', description: 'Racine du serveur (hors préfixe API)' }],
      responses: {
        200: jsonResponse('HealthResponse', 'API et base de données disponibles.'),
        503: jsonResponse('HealthResponse', 'API disponible mais base de données indisponible.'),
      },
    },
  },
  '/auth/register': {
    post: {
      operationId: 'register',
      tags: ['Auth'],
      summary: 'Crée un compte avec le rôle utilisateur par défaut.',
      requestBody: jsonBody('RegisterRequest'),
      responses: {
        201: jsonResponse('UserResponse', 'Compte créé.'),
        400: responseRef('BadRequest'),
        409: responseRef('Conflict'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/auth/login': {
    post: {
      operationId: 'login',
      tags: ['Auth'],
      summary: 'Authentifie un utilisateur.',
      requestBody: jsonBody('LoginRequest'),
      responses: {
        200: jsonResponse('AuthSessionResponse', 'Session ouverte.'),
        400: responseRef('BadRequest'),
        401: responseRef('Unauthorized'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/auth/refresh': {
    post: {
      operationId: 'refreshSession',
      tags: ['Auth'],
      summary: 'Renouvelle le jeton JWT actif et révoque celui qu’il remplace.',
      security: secure,
      responses: {
        200: jsonResponse('AuthSessionResponse', 'Session renouvelée.'),
        401: responseRef('Unauthorized'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/auth/logout': {
    post: {
      operationId: 'logout',
      tags: ['Auth'],
      summary: 'Révoque le jeton JWT courant.',
      security: secure,
      responses: {
        200: jsonResponse('LogoutResponse', 'Session fermée.'),
        401: responseRef('Unauthorized'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/users': {
    get: {
      operationId: 'listUsers',
      tags: ['Users'],
      summary: 'Liste les utilisateurs (administrateur uniquement).',
      security: secure,
      responses: {
        200: jsonResponse('UserListResponse', 'Utilisateurs retournés.'),
        401: responseRef('Unauthorized'),
        403: responseRef('Forbidden'),
        500: responseRef('InternalError'),
      },
    },
    post: {
      operationId: 'createUser',
      tags: ['Users'],
      summary: 'Crée un utilisateur et lui attribue éventuellement des rôles.',
      security: secure,
      requestBody: jsonBody('UserCreateRequest'),
      responses: {
        201: jsonResponse('UserResponse', 'Utilisateur créé.'),
        ...writeErrors,
      },
    },
  },
  '/users/{uuid}': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getUser',
      tags: ['Users'],
      summary: 'Retourne un utilisateur (administrateur uniquement).',
      security: secure,
      responses: {
        200: jsonResponse('UserResponse', 'Utilisateur retourné.'),
        ...resourceErrors,
      },
    },
    put: {
      operationId: 'updateUser',
      tags: ['Users'],
      summary: 'Met à jour un utilisateur et ses rôles.',
      security: secure,
      requestBody: jsonBody('UserUpdateRequest'),
      responses: {
        200: jsonResponse('UserResponse', 'Utilisateur mis à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteUser',
      tags: ['Users'],
      summary: 'Supprime logiquement un utilisateur.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/roles': {
    get: {
      operationId: 'listRoles',
      tags: ['Roles'],
      summary: 'Liste les rôles et leurs permissions (administrateur uniquement).',
      security: secure,
      responses: {
        200: jsonResponse('RoleListResponse', 'Rôles retournés.'),
        401: responseRef('Unauthorized'),
        403: responseRef('Forbidden'),
        500: responseRef('InternalError'),
      },
    },
    post: {
      operationId: 'createRole',
      tags: ['Roles'],
      summary: 'Crée un rôle et lui attribue éventuellement des permissions.',
      security: secure,
      requestBody: jsonBody('RoleCreateRequest'),
      responses: {
        201: jsonResponse('RoleResponse', 'Rôle créé.'),
        ...writeErrors,
      },
    },
  },
  '/roles/{uuid}': {
    parameters: [uuidParameter],
    put: {
      operationId: 'updateRole',
      tags: ['Roles'],
      summary: 'Met à jour un rôle et ses permissions.',
      security: secure,
      requestBody: jsonBody('RoleUpdateRequest'),
      responses: {
        200: jsonResponse('RoleResponse', 'Rôle mis à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteRole',
      tags: ['Roles'],
      summary: 'Supprime logiquement un rôle.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/permissions': {
    get: {
      operationId: 'listPermissions',
      tags: ['Permissions'],
      summary: 'Liste les permissions (administrateur uniquement).',
      security: secure,
      responses: {
        200: jsonResponse('PermissionListResponse', 'Permissions retournées.'),
        401: responseRef('Unauthorized'),
        403: responseRef('Forbidden'),
        500: responseRef('InternalError'),
      },
    },
    post: {
      operationId: 'createPermission',
      tags: ['Permissions'],
      summary: 'Crée une permission.',
      security: secure,
      requestBody: jsonBody('PermissionCreateRequest'),
      responses: {
        201: jsonResponse('PermissionResponse', 'Permission créée.'),
        ...writeErrors,
      },
    },
  },
  '/permissions/{uuid}': {
    parameters: [uuidParameter],
    put: {
      operationId: 'updatePermission',
      tags: ['Permissions'],
      summary: 'Met à jour une permission.',
      security: secure,
      requestBody: jsonBody('PermissionUpdateRequest'),
      responses: {
        200: jsonResponse('PermissionResponse', 'Permission mise à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deletePermission',
      tags: ['Permissions'],
      summary: 'Supprime logiquement une permission.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/categories': {
    get: {
      operationId: 'listCategories',
      tags: ['Categories'],
      summary: 'Liste les catégories.',
      description: 'Nécessite `categories.read`. Alias historique déprécié : `/api/categories`.',
      security: secure,
      parameters: [searchParameter],
      responses: {
        200: jsonResponse('CategoryListResponse', 'Catégories retournées.'),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createCategory',
      tags: ['Categories'],
      summary: 'Crée ou restaure une catégorie.',
      description: 'Nécessite `categories.create`. Alias historique déprécié : `/api/categories`.',
      security: secure,
      requestBody: jsonBody('CategoryCreateRequest'),
      responses: {
        201: jsonResponse('CategoryResponse', 'Catégorie créée ou restaurée.'),
        ...writeErrors,
      },
    },
  },
  '/categories/{uuid}': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getCategory',
      tags: ['Categories'],
      summary: 'Retourne une catégorie.',
      description: 'Nécessite `categories.read`.',
      security: secure,
      responses: {
        200: jsonResponse('CategoryResponse', 'Catégorie retournée.'),
        ...resourceErrors,
      },
    },
    put: {
      operationId: 'updateCategory',
      tags: ['Categories'],
      summary: 'Met à jour une catégorie.',
      description: 'Nécessite `categories.update`.',
      security: secure,
      requestBody: jsonBody('CategoryUpdateRequest'),
      responses: {
        200: jsonResponse('CategoryResponse', 'Catégorie mise à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteCategory',
      tags: ['Categories'],
      summary: 'Supprime logiquement une catégorie.',
      description: 'Nécessite `categories.delete`.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/brands': {
    get: {
      operationId: 'listBrands',
      tags: ['Brands'],
      summary: 'Liste les marques.',
      description: 'Nécessite `brands.read`. Alias historique déprécié : `/api/brands`.',
      security: secure,
      parameters: [searchParameter],
      responses: {
        200: jsonResponse('BrandListResponse', 'Marques retournées.'),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createBrand',
      tags: ['Brands'],
      summary: 'Crée ou restaure une marque.',
      description: 'Nécessite `brands.create`. Alias historique déprécié : `/api/brands`.',
      security: secure,
      requestBody: jsonBody('BrandCreateRequest'),
      responses: {
        201: jsonResponse('BrandResponse', 'Marque créée ou restaurée.'),
        ...writeErrors,
      },
    },
  },
  '/brands/{uuid}': {
    parameters: [uuidParameter],
    put: {
      operationId: 'updateBrand',
      tags: ['Brands'],
      summary: 'Met à jour une marque.',
      description: 'Nécessite `brands.update`.',
      security: secure,
      requestBody: jsonBody('BrandUpdateRequest'),
      responses: {
        200: jsonResponse('BrandResponse', 'Marque mise à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteBrand',
      tags: ['Brands'],
      summary: 'Supprime logiquement une marque.',
      description: 'Nécessite `brands.delete`.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/brands/{uuid}/logo': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getBrandLogo',
      tags: ['Brands'],
      summary: 'Affiche le logo protégé d’une marque.',
      description: 'Nécessite `brands.read` ou `materials.read`.',
      security: secure,
      responses: {
        200: binaryResponse('Image du logo.', ['image/jpeg', 'image/png', 'image/webp']),
        ...resourceErrors,
      },
    },
    post: {
      operationId: 'uploadBrandLogo',
      tags: ['Brands'],
      summary: 'Ajoute ou remplace le logo d’une marque (2 Mo maximum).',
      description: 'Nécessite `brands.create` ou `brands.update`.',
      security: secure,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Image JPEG, PNG ou WebP.',
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonResponse('LogoStatusResponse', 'Logo enregistré.'),
        ...resourceErrors,
      },
    },
    delete: {
      operationId: 'deleteBrandLogo',
      tags: ['Brands'],
      summary: 'Supprime le logo d’une marque.',
      description: 'Nécessite `brands.update`.',
      security: secure,
      responses: {
        200: jsonResponse('LogoStatusResponse', 'Logo supprimé ou déjà absent.'),
        ...resourceErrors,
      },
    },
  },
  '/materials': {
    get: {
      operationId: 'listMaterials',
      tags: ['Materials'],
      summary: 'Liste et filtre les matériels avec pagination.',
      description: 'Nécessite `materials.read`. Alias historique déprécié : `/api/materials`.',
      security: secure,
      parameters: [
        searchParameter,
        pageParameter,
        limitParameter,
        {
          name: 'active',
          in: 'query',
          schema: { type: 'boolean' },
        },
        {
          name: 'brandUuid',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'categoryUuid',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'sort',
          in: 'query',
          schema: { type: 'string', enum: ['name', 'purchasePrice', 'purchaseDate'] },
        },
        {
          name: 'direction',
          in: 'query',
          schema: { type: 'string', enum: ['ASC', 'DESC'] },
        },
      ],
      responses: {
        200: jsonResponse('MaterialListResponse', 'Page de matériels retournée.'),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createMaterial',
      tags: ['Materials'],
      summary: 'Crée ou restaure un matériel.',
      description: 'Nécessite `materials.create`.',
      security: secure,
      requestBody: jsonBody('MaterialCreateRequest'),
      responses: {
        201: jsonResponse('MaterialResponse', 'Matériel créé ou restauré.'),
        ...writeErrors,
      },
    },
  },
  '/materials/{uuid}': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getMaterial',
      tags: ['Materials'],
      summary: 'Retourne le détail d’un matériel et ses fichiers.',
      description: 'Nécessite `materials.read`.',
      security: secure,
      responses: {
        200: jsonResponse('MaterialResponse', 'Matériel retourné.'),
        ...resourceErrors,
      },
    },
    put: {
      operationId: 'updateMaterial',
      tags: ['Materials'],
      summary: 'Met à jour les données modifiables d’un matériel.',
      description: 'Nécessite `materials.update`.',
      security: secure,
      requestBody: jsonBody('MaterialUpdateRequest'),
      responses: {
        200: jsonResponse('MaterialResponse', 'Matériel mis à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteMaterial',
      tags: ['Materials'],
      summary: 'Supprime logiquement un matériel.',
      description: 'Nécessite `materials.delete`.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/materials/{uuid}/history': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getMaterialHistory',
      tags: ['Materials'],
      summary: 'Retourne le journal d’audit d’un matériel.',
      description: 'Nécessite `materials.read`.',
      security: secure,
      responses: {
        200: jsonResponse('AuditLogListResponse', 'Historique retourné.'),
        ...resourceErrors,
      },
    },
  },
  '/materials/{uuid}/photos': {
    parameters: [uuidParameter],
    post: {
      operationId: 'uploadMaterialPhoto',
      tags: ['Material files'],
      summary: 'Ajoute une photo au matériel (10 Mo, 10 photos maximum).',
      description: 'Nécessite `materials.update`. Formats acceptés : JPEG, PNG et WebP.',
      security: secure,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        201: jsonResponse('MaterialFileResponse', 'Photo ajoutée.'),
        ...resourceErrors,
      },
    },
  },
  '/materials/{uuid}/documents': {
    parameters: [uuidParameter],
    post: {
      operationId: 'uploadMaterialDocument',
      tags: ['Material files'],
      summary: 'Ajoute un document PDF au matériel (10 Mo maximum).',
      description: 'Nécessite `materials.update`.',
      security: secure,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file', 'documentType'],
              properties: {
                file: { type: 'string', format: 'binary' },
                documentType: {
                  type: 'string',
                  enum: ['invoice', 'manual', 'certificate', 'other'],
                },
              },
            },
          },
        },
      },
      responses: {
        201: jsonResponse('MaterialFileResponse', 'Document ajouté.'),
        ...resourceErrors,
      },
    },
  },
  '/materials/files/{fileUuid}/primary': {
    parameters: [fileUuidParameter],
    patch: {
      operationId: 'setPrimaryMaterialPhoto',
      tags: ['Material files'],
      summary: 'Définit une photo comme photo principale unique.',
      description: 'Nécessite `materials.update`.',
      security: secure,
      responses: {
        200: jsonResponse('MaterialFileResponse', 'Photo principale mise à jour.'),
        ...resourceErrors,
      },
    },
  },
  '/materials/files/{fileUuid}/content': {
    parameters: [fileUuidParameter],
    get: {
      operationId: 'getMaterialPhotoContent',
      tags: ['Material files'],
      summary: 'Affiche une photo protégée.',
      description: 'Nécessite `materials.read`.',
      security: secure,
      responses: {
        200: binaryResponse('Contenu de la photo.', ['image/jpeg', 'image/png', 'image/webp']),
        ...resourceErrors,
      },
    },
  },
  '/materials/files/{fileUuid}/download': {
    parameters: [fileUuidParameter],
    get: {
      operationId: 'downloadMaterialDocument',
      tags: ['Material files'],
      summary: 'Télécharge un document protégé.',
      description: 'Nécessite `materials.read`.',
      security: secure,
      responses: {
        200: binaryResponse('Document PDF.', ['application/pdf']),
        ...resourceErrors,
      },
    },
  },
  '/materials/files/{fileUuid}': {
    parameters: [fileUuidParameter],
    delete: {
      operationId: 'deleteMaterialFile',
      tags: ['Material files'],
      summary: 'Supprime un fichier et son enregistrement.',
      description: 'Nécessite `materials.update`.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/maintenance': {
    get: {
      operationId: 'listMaintenanceTasks',
      tags: ['Maintenance'],
      summary: 'Liste et filtre les plans d’entretien avec pagination.',
      description: 'Nécessite `maintenance.read`. Alias historique déprécié : `/api/maintenance`.',
      security: secure,
      parameters: [
        {
          name: 'materialUuid',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'priority',
          in: 'query',
          schema: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
        },
        {
          name: 'maintenanceType',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['preventive', 'inspection', 'replacement', 'lubrication', 'cleaning', 'custom'],
          },
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['upToDate', 'upcoming', 'dueToday', 'overdue'],
          },
        },
        { name: 'active', in: 'query', schema: { type: 'boolean' } },
        pageParameter,
        limitParameter,
      ],
      responses: {
        200: jsonResponse('MaintenanceListResponse', 'Page de plans retournée.'),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createMaintenanceTask',
      tags: ['Maintenance'],
      summary: 'Crée un plan et calcule sa prochaine échéance.',
      description: 'Nécessite `maintenance.create`.',
      security: secure,
      requestBody: jsonBody('MaintenanceCreateRequest'),
      responses: {
        201: jsonResponse('MaintenanceResponse', 'Plan créé.'),
        ...writeErrors,
      },
    },
  },
  '/maintenance/{uuid}': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getMaintenanceTask',
      tags: ['Maintenance'],
      summary: 'Retourne un plan d’entretien.',
      description: 'Nécessite `maintenance.read`.',
      security: secure,
      responses: {
        200: jsonResponse('MaintenanceResponse', 'Plan retourné.'),
        ...resourceErrors,
      },
    },
    put: {
      operationId: 'updateMaintenanceTask',
      tags: ['Maintenance'],
      summary: 'Met à jour un plan et recalcule son échéance.',
      description: 'Nécessite `maintenance.update`.',
      security: secure,
      requestBody: jsonBody('MaintenanceUpdateRequest'),
      responses: {
        200: jsonResponse('MaintenanceResponse', 'Plan mis à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteMaintenanceTask',
      tags: ['Maintenance'],
      summary: 'Supprime logiquement un plan.',
      description: 'Nécessite `maintenance.delete`.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/maintenance/{uuid}/status': {
    parameters: [uuidParameter],
    patch: {
      operationId: 'setMaintenanceTaskStatus',
      tags: ['Maintenance'],
      summary: 'Active ou désactive un plan.',
      description: 'Nécessite `maintenance.update`.',
      security: secure,
      requestBody: jsonBody('MaintenanceStatusRequest'),
      responses: {
        200: jsonResponse('MaintenanceResponse', 'Statut du plan mis à jour.'),
        ...resourceErrors,
      },
    },
  },
  '/maintenance/{uuid}/execute': {
    parameters: [uuidParameter],
    post: {
      operationId: 'executeMaintenanceTask',
      tags: ['Maintenance'],
      summary: 'Enregistre un entretien réalisé et recalcule l’échéance.',
      description: 'Nécessite `maintenance.execute`. La date du jour est utilisée par défaut.',
      security: secure,
      requestBody: jsonBody('MaintenanceExecuteRequest', false),
      responses: {
        200: jsonResponse('MaintenanceExecutionResponse', 'Entretien enregistré.'),
        ...resourceErrors,
      },
    },
  },
  '/maintenance/{uuid}/history': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getMaintenanceHistory',
      tags: ['Maintenance'],
      summary: 'Liste les entretiens réalisés pour un plan.',
      description: 'Nécessite `maintenance.read`.',
      security: secure,
      responses: {
        200: jsonResponse('MaintenanceHistoryResponse', 'Historique retourné.'),
        ...resourceErrors,
      },
    },
  },
  '/dashboard/summary': {
    get: {
      operationId: 'getDashboardSummary',
      tags: ['Dashboard'],
      summary: 'Retourne tous les indicateurs et entretiens du tableau de bord.',
      description:
        'Nécessite `dashboard.read`. Les listes `today`, `upcoming` et `overdue` correspondent exactement aux compteurs affichés. Alias historique déprécié : `/api/dashboard/summary`.',
      security: secure,
      responses: {
        200: jsonResponse('DashboardResponse', 'Synthèse retournée.'),
        401: responseRef('Unauthorized'),
        403: responseRef('Forbidden'),
        500: responseRef('InternalError'),
      },
    },
  },
};
