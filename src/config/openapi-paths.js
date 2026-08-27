import { STOCK_STATUS_VALUES } from '../core/inventory/stock-status.js';
import { MAINTENANCE_DEADLINE_STATUSES } from '../modules/maintenance/maintenance.constants.js';
import { DOCUMENT_TYPES } from '../modules/materials/material-file.constants.js';

const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });
const parameterRef = (name) => ({ $ref: `#/components/parameters/${name}` });
const cacheControlHeaders = {
  'Cache-Control': { $ref: '#/components/headers/CacheControl' },
};
const withCacheControl = (response) => ({
  ...response,
  headers: { ...cacheControlHeaders, ...(response.headers ?? {}) },
});
const jsonBody = (schemaName, required = true) => ({
  required,
  content: { 'application/json': { schema: schemaRef(schemaName) } },
});
const jsonResponse = (schemaName, description) =>
  withCacheControl({
    description,
    content: { 'application/json': { schema: schemaRef(schemaName) } },
  });
const binaryResponse = (description, contentTypes) =>
  withCacheControl({
    description,
    content: Object.fromEntries(
      contentTypes.map((contentType) => [
        contentType,
        { schema: { type: 'string', format: 'binary' } },
      ]),
    ),
  });
const noContent = withCacheControl({
  description: 'Operation completed successfully; no response body.',
});
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
const companyUuidHeader = parameterRef('CompanyUuidHeader');
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
  description: 'Nombre de résultats par page.',
  schema: { type: 'integer', enum: [5, 10, 25], default: 5 },
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
      description:
        'Disponible uniquement lorsque `PUBLIC_REGISTRATION_ENABLED=true`. Cette option est désactivée par défaut en production. Le nom de famille est stocké en majuscules.',
      requestBody: jsonBody('RegisterRequest'),
      responses: {
        201: jsonResponse(
          'RegistrationResponse',
          'Compte créé ; une vérification de l’adresse email est nécessaire.',
        ),
        400: responseRef('BadRequest'),
        403: responseRef('Forbidden'),
        409: responseRef('Conflict'),
        429: responseRef('TooManyRequests'),
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
        403: responseRef('Forbidden'),
        429: responseRef('TooManyRequests'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/auth/verify-email': {
    post: {
      operationId: 'verifyEmail',
      tags: ['Auth'],
      summary: 'Vérifie l’adresse email associée à une inscription publique.',
      description:
        'Route publique protégée par un quota dédié. Le jeton opaque est à usage unique et expire automatiquement.',
      requestBody: jsonBody('VerifyEmailRequest'),
      responses: {
        200: jsonResponse('EmailVerificationResponse', 'Adresse email vérifiée.'),
        400: responseRef('BadRequest'),
        429: responseRef('TooManyRequests'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/auth/verify-email/resend': {
    post: {
      operationId: 'resendEmailVerification',
      tags: ['Auth'],
      summary: 'Demande un nouvel email de vérification.',
      description:
        'Route publique protégée par un quota et un délai minimal entre deux envois. La réponse reste identique que le compte existe ou non.',
      requestBody: jsonBody('ResendEmailVerificationRequest'),
      responses: {
        200: jsonResponse('EmailVerificationResponse', 'Demande prise en compte.'),
        400: responseRef('BadRequest'),
        429: responseRef('TooManyRequests'),
        503: responseRef('ServiceUnavailable'),
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
  '/companies': {
    get: {
      operationId: 'listCompanies',
      tags: ['Companies'],
      summary: 'Liste les sociétés accessibles.',
      description:
        'Nécessite `companies.read`. Sans `companies.access.all`, seules les sociétés attribuées à l’utilisateur sont retournées. Le filtre `deleted=true` nécessite également `companies.deleted.read`.',
      security: secure,
      parameters: [
        searchParameter,
        { name: 'active', in: 'query', schema: { type: 'boolean' } },
        {
          name: 'deleted',
          in: 'query',
          description: 'Retourne uniquement les sociétés supprimées logiquement.',
          schema: { type: 'boolean', default: false },
        },
        pageParameter,
        limitParameter,
      ],
      responses: {
        200: jsonResponse('CompanyListResponse', 'Sociétés retournées.'),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createCompany',
      tags: ['Companies'],
      summary: 'Crée une société.',
      description:
        'Nécessite `companies.create`. Sans `companies.access.all`, le créateur est automatiquement rattaché à la nouvelle société. Restaurer implicitement une société supprimée portant le même nom nécessite aussi `companies.deleted.update`.',
      security: secure,
      requestBody: jsonBody('CompanyCreateRequest'),
      responses: {
        201: jsonResponse('CompanyResponse', 'Société créée.'),
        ...writeErrors,
      },
    },
  },
  '/companies/{uuid}': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getCompany',
      tags: ['Companies'],
      summary: 'Retourne une société accessible.',
      description: 'Nécessite `companies.read` et l’accès à la société demandée.',
      security: secure,
      responses: {
        200: jsonResponse('CompanyResponse', 'Société retournée.'),
        ...resourceErrors,
      },
    },
    put: {
      operationId: 'updateCompany',
      tags: ['Companies'],
      summary: 'Modifie une société accessible.',
      description:
        '`companies.update` protège le nom et la description ; `companies.status.update` protège le statut.',
      security: secure,
      requestBody: jsonBody('CompanyUpdateRequest'),
      responses: {
        200: jsonResponse('CompanyResponse', 'Société mise à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteCompany',
      tags: ['Companies'],
      summary: 'Supprime une société vide.',
      description:
        'Nécessite `companies.delete`. La suppression est refusée tant que des utilisateurs ou des données y sont rattachés.',
      security: secure,
      responses: { 204: noContent, ...writeErrors },
    },
  },
  '/companies/{uuid}/restore': {
    parameters: [uuidParameter],
    post: {
      operationId: 'restoreCompany',
      tags: ['Companies'],
      summary: 'Restaure une société supprimée logiquement.',
      description:
        'Nécessite `companies.deleted.update` et l’accès à la société demandée ; `companies.access.all` permet de restaurer toute société supprimée. Le statut actif ou inactif précédent est conservé.',
      security: secure,
      responses: {
        200: jsonResponse('CompanyResponse', 'Société restaurée.'),
        ...writeErrors,
      },
    },
  },
  '/users': {
    get: {
      operationId: 'listUsers',
      tags: ['Users'],
      summary: 'Liste les utilisateurs.',
      description:
        'Nécessite `users.read`. Les résultats appartiennent à la société active, sauf avec `companies.access.all`, et restent limités aux rôles couverts par les permissions dynamiques `users.roles.<nom-du-rôle>.read` ; `users.all.read` retire uniquement ce filtre de rôle. Les résultats sont triés par dernière connexion décroissante. Le filtre `deleted=true` nécessite également `users.deleted.read`.',
      security: secure,
      parameters: [
        searchParameter,
        { name: 'active', in: 'query', schema: { type: 'boolean' } },
        {
          name: 'deleted',
          in: 'query',
          description: 'Retourne uniquement les comptes supprimés logiquement.',
          schema: { type: 'boolean', default: false },
        },
        { name: 'roleUuid', in: 'query', schema: { type: 'string', format: 'uuid' } },
        pageParameter,
        limitParameter,
      ],
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
      description:
        'Nécessite `users.create`. Fournir `roleUuids` nécessite `users.roles.update` et fournir `companyUuids` nécessite `users.companies.update`. Restaurer implicitement un compte supprimé portant le même email nécessite aussi `users.deleted.update`. Sans `companyUuids`, la société active est attribuée. Le nom de famille est stocké en majuscules.',
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
      summary: 'Retourne un utilisateur.',
      description:
        'Nécessite `users.read` et une permission dynamique `users.roles.<nom-du-rôle>.read` correspondant à l’un des rôles de l’utilisateur demandé, ou `users.all.read`.',
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
      description:
        '`users.update` protège les informations générales, `users.status.update` le statut, `users.password.update` le mot de passe, `users.roles.update` les rôles et `users.companies.update` les sociétés. Toutes les permissions correspondant aux champs fournis sont exigées. Le nom de famille est stocké en majuscules. Une modification des sociétés invalide les sessions actives de l’utilisateur concerné.',
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
      description: 'Nécessite `users.delete`.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/users/{uuid}/email-verification/resend': {
    parameters: [uuidParameter],
    post: {
      operationId: 'resendUserEmailVerification',
      tags: ['Users'],
      summary: 'Renvoie l’email de vérification d’un utilisateur.',
      description:
        'Nécessite `users.email_verification.resend`. Le délai minimal entre deux envois s’applique également aux renvois administratifs ; une nouvelle tentative anticipée retourne `429` et `Retry-After`.',
      security: secure,
      responses: {
        200: jsonResponse('EmailVerificationResponse', 'Email de vérification envoyé.'),
        401: responseRef('Unauthorized'),
        403: responseRef('Forbidden'),
        404: responseRef('NotFound'),
        409: responseRef('Conflict'),
        503: responseRef('ServiceUnavailable'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/users/{uuid}/restore': {
    parameters: [uuidParameter],
    post: {
      operationId: 'restoreUser',
      tags: ['Users'],
      summary: 'Restaure un utilisateur supprimé logiquement.',
      description:
        'Nécessite `users.deleted.update`. Le statut, les rôles et l’état de vérification précédents sont conservés, tandis que les anciennes sessions sont invalidées.',
      security: secure,
      responses: {
        200: jsonResponse('UserResponse', 'Utilisateur restauré.'),
        ...writeErrors,
      },
    },
  },
  '/roles': {
    get: {
      operationId: 'listRoles',
      tags: ['Roles'],
      summary: 'Liste les rôles et leurs permissions.',
      description: 'Nécessite `roles.read`.',
      security: secure,
      parameters: [
        searchParameter,
        { name: 'permissionUuid', in: 'query', schema: { type: 'string', format: 'uuid' } },
        pageParameter,
        limitParameter,
      ],
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
      description:
        'Nécessite `roles.create`. Fournir `permissionUuids` nécessite également `roles.permissions.update`. Une permission lisible `users.roles.<nom-du-rôle>.read` est créée automatiquement et attribuée au nouveau rôle.',
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
      summary: 'Met à jour la description et les permissions d’un rôle.',
      description:
        '`roles.update` protège la description. Le nom du rôle est immuable après sa création. Modifier `permissionUuids` nécessite `roles.permissions.update`. Toutes les permissions correspondant aux champs fournis sont exigées. Une modification des permissions invalide les sessions actives des utilisateurs concernés, à l’exception de la session de l’administrateur réalisant l’opération.',
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
      description:
        'Nécessite `roles.delete`. La permission dynamique de consultation des utilisateurs associée au rôle est supprimée dans la même transaction. La suppression invalide les sessions actives des utilisateurs concernés, à l’exception de la session de l’administrateur réalisant l’opération.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/permissions': {
    get: {
      operationId: 'listPermissions',
      tags: ['Permissions'],
      summary: 'Liste les permissions.',
      description: 'Nécessite `permissions.read`.',
      security: secure,
      parameters: [searchParameter, pageParameter, limitParameter],
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
      description:
        'Nécessite `permissions.create`. L’espace de noms dynamique `users.roles.<nom-du-rôle>.read` est réservé à la gestion automatique des rôles.',
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
      description:
        'Nécessite `permissions.update`. Les permissions dynamiques `users.roles.<nom-du-rôle>.read` sont gérées automatiquement et ne peuvent pas être modifiées ici.',
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
      description:
        'Nécessite `permissions.delete`. Les permissions dynamiques `users.roles.<nom-du-rôle>.read` ne peuvent être supprimées qu’avec leur rôle.',
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
      parameters: [searchParameter, pageParameter, limitParameter],
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
      summary: 'Met à jour une catégorie, y compris son statut actif ou inactif.',
      description:
        '`categories.update` protège le nom et la description. Modifier `active` nécessite `categories.status.update`. Toutes les permissions correspondant aux champs fournis sont exigées.',
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
  '/manufacturers': {
    get: {
      operationId: 'listManufacturers',
      tags: ['Manufacturers'],
      summary: 'Liste les fabricants.',
      description:
        'Nécessite `manufacturers.read` ou `maintenance.parts.read`. Les anciennes routes `/brands` et `/maintenance/manufacturers` sont dépréciées.',
      security: secure,
      parameters: [searchParameter, pageParameter, limitParameter],
      responses: {
        200: jsonResponse('ManufacturerListResponse', 'Fabricants retournés.'),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createManufacturer',
      tags: ['Manufacturers'],
      summary: 'Crée ou restaure un fabricant.',
      description: 'Nécessite `manufacturers.create`.',
      security: secure,
      requestBody: jsonBody('ManufacturerCreateRequest'),
      responses: {
        201: jsonResponse('ManufacturerResponse', 'Fabricant créé ou restauré.'),
        ...writeErrors,
      },
    },
  },
  '/manufacturers/{uuid}': {
    parameters: [uuidParameter],
    put: {
      operationId: 'updateManufacturer',
      tags: ['Manufacturers'],
      summary: 'Met à jour un fabricant, y compris son statut actif ou inactif.',
      description:
        '`manufacturers.update` protège le nom. Modifier `active` nécessite `manufacturers.status.update`. Toutes les permissions correspondant aux champs fournis sont exigées.',
      security: secure,
      requestBody: jsonBody('ManufacturerUpdateRequest'),
      responses: {
        200: jsonResponse('ManufacturerResponse', 'Fabricant mis à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteManufacturer',
      tags: ['Manufacturers'],
      summary: 'Supprime logiquement un fabricant inutilisé.',
      description: 'Nécessite `manufacturers.delete`.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/manufacturers/{uuid}/logo': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getManufacturerLogo',
      tags: ['Manufacturers'],
      summary: 'Affiche le logo protégé d’un fabricant.',
      description:
        'Nécessite `manufacturers.read`, `materials.read`, `maintenance.read` ou `maintenance.parts.read`.',
      security: secure,
      responses: {
        200: binaryResponse('Image du logo.', ['image/jpeg', 'image/png', 'image/webp']),
        ...resourceErrors,
      },
    },
    post: {
      operationId: 'uploadManufacturerLogo',
      tags: ['Manufacturers'],
      summary: 'Ajoute ou remplace le logo d’un fabricant (2 Mo maximum).',
      description:
        'Nécessite `manufacturers.logo.upload`. Le MIME déclaré et la signature binaire doivent correspondre à une image JPEG, PNG ou WebP.',
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
                  description: 'Image JPEG, PNG ou WebP validée par sa signature binaire.',
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
      operationId: 'deleteManufacturerLogo',
      tags: ['Manufacturers'],
      summary: 'Supprime le logo d’un fabricant.',
      description: 'Nécessite `manufacturers.logo.delete`.',
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
          name: 'manufacturerUuid',
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
          schema: {
            type: 'string',
            enum: ['name', 'purchasePrice', 'purchaseDate'],
            default: 'purchaseDate',
          },
        },
        {
          name: 'direction',
          in: 'query',
          schema: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' },
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
  '/materials/options': {
    get: {
      operationId: 'listMaterialOptions',
      tags: ['Materials'],
      summary: 'Retourne les matériels destinés aux listes de sélection.',
      description:
        'Nécessite `materials.read`, `maintenance.read` ou `maintenance.parts.stock.consume`. La réponse légère ne contient que l’identifiant, le nom et le statut.',
      security: secure,
      parameters: [
        searchParameter,
        { name: 'active', in: 'query', schema: { type: 'boolean' } },
        pageParameter,
        limitParameter,
      ],
      responses: {
        200: jsonResponse('MaterialOptionListResponse', 'Options de matériels retournées.'),
        ...standardErrors,
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
      summary: 'Met à jour un matériel, y compris son statut actif ou inactif.',
      description:
        '`materials.update` protège les informations générales. Modifier `active` nécessite `materials.status.update`. Toutes les permissions correspondant aux champs fournis sont exigées. La désactivation rend inactifs les plans actifs associés. La réactivation restaure uniquement les plans désactivés au même instant que le matériel.',
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
      description:
        'Nécessite `materials.delete`. La suppression est refusée si un plan de maintenance, y compris supprimé logiquement, est encore associé au matériel.',
      security: secure,
      responses: { 204: noContent, ...writeErrors },
    },
  },
  '/materials/{uuid}/history': {
    parameters: [uuidParameter],
    get: {
      operationId: 'getMaterialHistory',
      tags: ['Materials'],
      summary: 'Retourne le journal d’audit d’un matériel.',
      description:
        'Nécessite `materials.read`. Les identifiants relationnels internes sont remplacés par les noms du fabricant et de la catégorie.',
      security: secure,
      parameters: [pageParameter, limitParameter],
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
      description:
        'Nécessite `materials.photos.create`. Formats acceptés : JPEG, PNG et WebP, avec correspondance obligatoire entre le MIME déclaré et la signature binaire.',
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
      description:
        'Nécessite `materials.documents.create`. Le MIME déclaré et la signature binaire doivent correspondre à un document PDF.',
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
                  enum: DOCUMENT_TYPES,
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
      description: 'Nécessite `materials.photos.set_primary`.',
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
      description: 'Nécessite `materials.files.delete`.',
      security: secure,
      responses: { 204: noContent, ...resourceErrors },
    },
  },
  '/maintenance/operations': {
    get: {
      operationId: 'listMaintenanceOperations',
      tags: ['Maintenance'],
      summary: 'Liste les opérations réutilisables.',
      description: 'Nécessite `maintenance.operations.read` ou `maintenance.read`.',
      security: secure,
      parameters: [
        searchParameter,
        { name: 'active', in: 'query', schema: { type: 'boolean' } },
        pageParameter,
        limitParameter,
      ],
      responses: {
        200: jsonResponse(
          'MaintenanceOperationListResponse',
          'Opérations de maintenance retournées.',
        ),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createMaintenanceOperation',
      tags: ['Maintenance'],
      summary: 'Crée ou restaure une opération réutilisable.',
      description: 'Nécessite `maintenance.operations.create`.',
      security: secure,
      requestBody: jsonBody('MaintenanceOperationCreateRequest'),
      responses: {
        201: jsonResponse('MaintenanceOperationResponse', 'Opération créée.'),
        ...writeErrors,
      },
    },
  },
  '/maintenance/operations/{uuid}': {
    parameters: [uuidParameter],
    put: {
      operationId: 'updateMaintenanceOperation',
      tags: ['Maintenance'],
      summary: 'Met à jour une opération et les intitulés des plans associés.',
      description:
        '`maintenance.operations.update` protège les informations générales. Modifier `active` nécessite `maintenance.operations.status.update`. Toutes les permissions correspondant aux champs fournis sont exigées.',
      security: secure,
      requestBody: jsonBody('MaintenanceOperationUpdateRequest'),
      responses: {
        200: jsonResponse('MaintenanceOperationResponse', 'Opération mise à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteMaintenanceOperation',
      tags: ['Maintenance'],
      summary: 'Supprime une opération inutilisée.',
      description:
        'Nécessite `maintenance.operations.delete`. Une opération liée à un plan est conservée.',
      security: secure,
      responses: { 204: noContent, ...writeErrors },
    },
  },
  '/suppliers': {
    get: {
      operationId: 'listSuppliers',
      tags: ['Suppliers'],
      summary: 'Liste les fournisseurs.',
      description:
        'Nécessite `suppliers.read` ou `maintenance.parts.read`. L’ancienne route `/maintenance/suppliers` est dépréciée.',
      security: secure,
      parameters: [searchParameter, pageParameter, limitParameter],
      responses: {
        200: jsonResponse('SupplierListResponse', 'Fournisseurs retournés.'),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createSupplier',
      tags: ['Suppliers'],
      summary: 'Crée ou restaure un fournisseur.',
      description: 'Nécessite `suppliers.create`.',
      security: secure,
      requestBody: jsonBody('SupplierCreateRequest'),
      responses: {
        201: jsonResponse('SupplierResponse', 'Fournisseur créé.'),
        ...writeErrors,
      },
    },
  },
  '/suppliers/{uuid}': {
    parameters: [uuidParameter],
    put: {
      operationId: 'updateSupplier',
      tags: ['Suppliers'],
      summary:
        'Met à jour un fournisseur, son statut actif ou inactif et le nom conservé sur ses pièces.',
      description:
        '`suppliers.update` protège les informations générales. Modifier `active` nécessite `suppliers.status.update`. Toutes les permissions correspondant aux champs fournis sont exigées.',
      security: secure,
      requestBody: jsonBody('SupplierUpdateRequest'),
      responses: {
        200: jsonResponse('SupplierResponse', 'Fournisseur mis à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteSupplier',
      tags: ['Suppliers'],
      summary: 'Supprime un fournisseur inutilisé.',
      description: 'Nécessite `suppliers.delete`. Un fournisseur lié à une pièce est conservé.',
      security: secure,
      responses: { 204: noContent, ...writeErrors },
    },
  },
  '/maintenance/parts': {
    get: {
      operationId: 'listMaintenanceParts',
      tags: ['Maintenance'],
      summary: 'Liste les références de pièces commandables.',
      description: 'Nécessite `maintenance.parts.read` ou `maintenance.read`.',
      security: secure,
      parameters: [
        searchParameter,
        { name: 'active', in: 'query', schema: { type: 'boolean' } },
        {
          name: 'stockStatus',
          in: 'query',
          schema: { type: 'string', enum: STOCK_STATUS_VALUES },
        },
        pageParameter,
        limitParameter,
      ],
      responses: {
        200: jsonResponse('MaintenancePartListResponse', 'Pièces retournées.'),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createMaintenancePart',
      tags: ['Maintenance'],
      summary: 'Crée ou restaure une référence de pièce.',
      description: 'Nécessite `maintenance.parts.create`.',
      security: secure,
      requestBody: jsonBody('MaintenancePartCreateRequest'),
      responses: {
        201: jsonResponse('MaintenancePartResponse', 'Pièce créée.'),
        ...writeErrors,
      },
    },
  },
  '/maintenance/parts/{uuid}': {
    parameters: [uuidParameter],
    put: {
      operationId: 'updateMaintenancePart',
      tags: ['Maintenance'],
      summary: 'Met à jour une référence de pièce.',
      description:
        '`maintenance.parts.update` protège les informations générales. Modifier `active` nécessite `maintenance.parts.status.update`. Toutes les permissions correspondant aux champs fournis sont exigées.',
      security: secure,
      requestBody: jsonBody('MaintenancePartUpdateRequest'),
      responses: {
        200: jsonResponse('MaintenancePartResponse', 'Pièce mise à jour.'),
        ...writeErrors,
      },
    },
    delete: {
      operationId: 'deleteMaintenancePart',
      tags: ['Maintenance'],
      summary: 'Supprime une pièce inutilisée.',
      description: 'Nécessite `maintenance.parts.delete`. Une pièce liée à un plan est conservée.',
      security: secure,
      responses: { 204: noContent, ...writeErrors },
    },
  },
  '/maintenance/parts/{uuid}/stock': {
    parameters: [uuidParameter],
    patch: {
      operationId: 'updateMaintenancePartStock',
      tags: ['Maintenance'],
      summary: 'Applique une opération atomique au stock d’une pièce.',
      description:
        '`adjust` nécessite `maintenance.parts.stock.adjust_on_hand` pour `quantityOnHand` et `maintenance.parts.stock.adjust_on_order` pour `quantityOnOrder`. Fournir les deux quantités nécessite les deux permissions. Le format historique `stockStatus`/`stockQuantity`, qui corrige les deux compteurs, nécessite également les deux permissions. `order` nécessite `maintenance.parts.stock.order`. `receive` nécessite `maintenance.parts.stock.receive`. `performedAt` indique la date métier du mouvement, prend la date du jour par défaut et ne peut pas être dans le futur. Les écritures sont transactionnelles et historisées.',
      security: secure,
      requestBody: jsonBody('MaintenancePartStockRequest'),
      responses: {
        200: jsonResponse('MaintenancePartResponse', 'Stock de la pièce mis à jour.'),
        ...writeErrors,
      },
    },
  },
  '/maintenance/parts/{uuid}/stock-movements': {
    parameters: [uuidParameter],
    get: {
      operationId: 'listMaintenancePartStockMovements',
      tags: ['Maintenance'],
      summary: 'Liste les mouvements de stock d’une pièce.',
      description:
        'Nécessite `maintenance.parts.read`. Les mouvements sont retournés de la date métier la plus récente à la plus ancienne, puis par date de création.',
      security: secure,
      parameters: [pageParameter, limitParameter],
      responses: {
        200: jsonResponse('StockMovementListResponse', 'Mouvements de stock retournés.'),
        ...standardErrors,
      },
    },
  },
  '/maintenance/parts/{uuid}/price': {
    parameters: [uuidParameter],
    patch: {
      operationId: 'updateMaintenancePartPrice',
      tags: ['Maintenance'],
      summary: 'Modifie le prix unitaire courant d’une pièce.',
      description:
        'Nécessite `maintenance.parts.price.update`. `performedAt` indique la date métier du changement, prend la date du jour par défaut et ne peut pas être dans le futur. Le changement est transactionnel et conserve automatiquement l’ancien et le nouveau prix.',
      security: secure,
      requestBody: jsonBody('MaintenancePartPriceRequest'),
      responses: {
        200: jsonResponse('MaintenancePartResponse', 'Prix unitaire de la pièce mis à jour.'),
        ...writeErrors,
      },
    },
  },
  '/maintenance/parts/{uuid}/price-history': {
    parameters: [uuidParameter],
    get: {
      operationId: 'listMaintenancePartPriceHistory',
      tags: ['Maintenance'],
      summary: 'Liste l’historique immuable des prix unitaires d’une pièce.',
      description:
        'Nécessite `maintenance.parts.read`. Les changements sont retournés de la date métier la plus récente à la plus ancienne, puis par date de création.',
      security: secure,
      parameters: [pageParameter, limitParameter],
      responses: {
        200: jsonResponse(
          'MaintenancePartPriceHistoryListResponse',
          'Historique des prix retourné.',
        ),
        ...standardErrors,
      },
    },
  },
  '/maintenance/order-list': {
    get: {
      operationId: 'getMaintenanceOrderList',
      tags: ['Maintenance'],
      summary: 'Agrège les pièces nécessaires aux échéances et aux plans selon l’usure.',
      description:
        'Nécessite `maintenance.read`. Une échéance correspond à un besoin de pièces. La quantité en stock atelier ou déjà commandée est déduite du besoin agrégé ; seules les quantités restant à commander sont retournées. Une pièce désactivée reste comptée lorsqu’un besoin non couvert subsiste. Le filtre `status`, lorsqu’il est renseigné, prend la priorité sur la période. `includeWearBased` ajoute une fois les besoins de chaque plan actif suivi selon l’usure. `includeLowStock` nécessite aussi `maintenance.parts.read` et ajoute les pièces actives dont le stock disponible est inférieur ou égal à une unité lorsqu’une commande reste nécessaire pour atteindre deux unités. `lowStockOnly` nécessite uniquement `maintenance.parts.read` et retourne la vue exhaustive de ces pièces pour le dashboard, y compris lorsqu’une commande couvre déjà le réapprovisionnement.',
      security: secure,
      parameters: [
        {
          name: 'status',
          in: 'query',
          description: 'Statut exact d’échéance, partagé avec le filtre de la page Maintenance.',
          schema: {
            type: 'string',
            enum: MAINTENANCE_DEADLINE_STATUSES,
          },
        },
        {
          name: 'horizonDays',
          in: 'query',
          schema: { type: 'integer', minimum: 0, maximum: 365, default: 30 },
        },
        {
          name: 'includeOverdue',
          in: 'query',
          schema: { type: 'boolean', default: true },
        },
        {
          name: 'includeWearBased',
          in: 'query',
          schema: { type: 'boolean', default: false },
        },
        {
          name: 'includeLowStock',
          in: 'query',
          schema: { type: 'boolean', default: false },
        },
        {
          name: 'lowStockOnly',
          in: 'query',
          schema: { type: 'boolean', default: false },
        },
      ],
      responses: {
        200: jsonResponse('MaintenanceOrderListResponse', 'Liste de commande calculée.'),
        ...standardErrors,
      },
    },
  },
  '/maintenance/interventions': {
    get: {
      operationId: 'listMaintenanceInterventions',
      tags: ['Maintenance'],
      summary: 'Liste les interventions ponctuelles de maintenance.',
      description:
        'Nécessite `maintenance.read`. Les interventions sont triées par date de réalisation décroissante et peuvent être filtrées par matériel.',
      security: secure,
      parameters: [
        {
          name: 'materialUuid',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
        },
        pageParameter,
        limitParameter,
      ],
      responses: {
        200: jsonResponse(
          'MaintenanceInterventionListResponse',
          'Page d’interventions ponctuelles retournée.',
        ),
        ...standardErrors,
      },
    },
    post: {
      operationId: 'createMaintenanceIntervention',
      tags: ['Maintenance'],
      summary: 'Enregistre une intervention ponctuelle et consomme ses pièces.',
      description:
        'Nécessite `maintenance.parts.stock.consume`. L’intervention, les coûts et les mouvements de stock sont enregistrés dans une transaction unique. La date du jour est utilisée par défaut et une date future est refusée.',
      security: secure,
      requestBody: jsonBody('MaintenanceInterventionCreateRequest'),
      responses: {
        201: jsonResponse('MaintenanceInterventionResponse', 'Intervention ponctuelle créée.'),
        ...writeErrors,
      },
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
          ...searchParameter,
          description:
            'Recherche dans le nom du plan, sa description, ses notes, le matériel et l’opération.',
        },
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
            enum: MAINTENANCE_DEADLINE_STATUSES,
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
      summary: 'Crée un plan depuis une opération et calcule sa prochaine échéance.',
      description:
        'Nécessite `maintenance.create`. Le matériel associé doit être actif. Un intervalle à `0` crée un plan selon l’usure sans échéance calendaire. Le payload historique avec intitulé libre reste accepté pour compatibilité.',
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
      description:
        'Nécessite `maintenance.update`. Un intervalle à `0` conserve le plan sans échéance calendaire.',
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
      description:
        'Nécessite `maintenance.status.update`. Un plan ne peut pas être activé tant que son matériel est inactif.',
      security: secure,
      requestBody: jsonBody('MaintenanceStatusRequest'),
      responses: {
        200: jsonResponse('MaintenanceResponse', 'Statut du plan mis à jour.'),
        ...writeErrors,
      },
    },
  },
  '/maintenance/{uuid}/execute': {
    parameters: [uuidParameter],
    post: {
      operationId: 'executeMaintenanceTask',
      tags: ['Maintenance'],
      summary: 'Enregistre un entretien réalisé et recalcule l’échéance.',
      description:
        'Nécessite `maintenance.execute`. Le plan et son matériel doivent être actifs. La date du jour est utilisée par défaut et un plan selon l’usure reste sans échéance. `partsAction=consume` retire transactionnellement les pièces du stock et fige leur prix pour le calcul des coûts historiques. `partsAction=skip` nécessite également `maintenance.execute.skip_parts`, conserve le stock, exige un commentaire et trace les pièces non remplacées dans l’historique.',
      security: secure,
      requestBody: jsonBody('MaintenanceExecuteRequest', false),
      responses: {
        200: jsonResponse('MaintenanceExecutionResponse', 'Entretien enregistré.'),
        ...writeErrors,
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
      parameters: [pageParameter, limitParameter],
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
      summary: 'Retourne les indicateurs autorisés du tableau de bord.',
      description:
        'Nécessite `dashboard.read`. Les valorisations du parc nécessitent en plus `dashboard.read.financial`. Les échéances de maintenance sont incluses avec `maintenance.read` ; le nombre de pièces actives avec zéro ou une unité disponible nécessite `maintenance.parts.read`. Les valorisations de stock et coûts annuels nécessitent `maintenance.read` et `dashboard.read.financial`. Les coûts correspondent aux pièces réellement consommées pendant l’année de réalisation. Les listes `today`, `upcoming`, `overdue` et `wearBased` correspondent exactement aux compteurs affichés. Alias historique déprécié : `/api/dashboard/summary`.',
      security: secure,
      responses: {
        200: jsonResponse('DashboardResponse', 'Synthèse retournée.'),
        401: responseRef('Unauthorized'),
        403: responseRef('Forbidden'),
        500: responseRef('InternalError'),
      },
    },
  },
  '/history/{section}': {
    get: {
      operationId: 'listConsolidatedHistory',
      tags: ['History'],
      summary: 'Liste l’historique consolidé d’une section avec pagination.',
      description:
        'Nécessite la permission dédiée correspondant à la section : `history.fleet.read`, `history.maintenance.read` ou `history.administration.read`. La maintenance consolide les audits, entretiens planifiés, interventions hors plan, mouvements de stock et changements de prix sans doublons. Les événements sont triés par date métier puis par heure exacte d’enregistrement.',
      security: secure,
      parameters: [
        {
          name: 'section',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['fleet', 'maintenance', 'administration'] },
        },
        searchParameter,
        {
          name: 'type',
          in: 'query',
          schema: {
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
        },
        { name: 'action', in: 'query', schema: { type: 'string', maxLength: 100 } },
        { name: 'userUuid', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'through', in: 'query', schema: { type: 'string', format: 'date' } },
        pageParameter,
        limitParameter,
      ],
      responses: {
        200: jsonResponse('HistoryEventListResponse', 'Page d’événements retournée.'),
        ...standardErrors,
      },
    },
  },
};

const companyScopedPrefixes = [
  '/users',
  '/categories',
  '/materials',
  '/manufacturers',
  '/suppliers',
  '/maintenance',
  '/dashboard',
  '/history',
];

for (const [path, pathItem] of Object.entries(openApiPaths)) {
  if (!companyScopedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    continue;
  }
  for (const operation of Object.values(pathItem)) {
    if (!operation?.responses) continue;
    operation.parameters = [...(operation.parameters ?? []), companyUuidHeader];
  }
}

// Every documented `/api/v1` operation is covered by the application-wide API quota.
for (const [path, pathItem] of Object.entries(openApiPaths)) {
  if (path === '/health') continue;
  for (const operation of Object.values(pathItem)) {
    if (operation?.responses) {
      operation.responses[429] ??= responseRef('TooManyRequests');
    }
  }
}
