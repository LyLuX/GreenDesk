import appVersion from './app-version.js';
import {
  openApiHeaders,
  openApiParameters,
  openApiResponses,
  openApiSchemas,
} from './openapi-components.js';
import { openApiPaths } from './openapi-paths.js';

/** OpenAPI contract served by Swagger UI. */
const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'GreenDesk API',
    version: appVersion,
    description:
      'Contrat de l’API GreenDesk. Les routes sans préfixe dans cette documentation utilisent le serveur `/api/v1`. Les alias historiques sous `/api` restent disponibles pour compatibilité mais sont dépréciés.',
  },
  servers: [{ url: '/api/v1', description: 'Version 1 API' }],
  tags: [
    { name: 'System', description: 'État et point d’entrée de l’API.' },
    { name: 'Auth', description: 'Authentification et cycle de session JWT.' },
    { name: 'Companies', description: 'Sociétés et frontières d’accès aux données métier.' },
    { name: 'Users', description: 'Administration des utilisateurs.' },
    { name: 'Roles', description: 'Administration des rôles.' },
    { name: 'Permissions', description: 'Administration des permissions.' },
    { name: 'Categories', description: 'Référentiel des catégories.' },
    {
      name: 'Manufacturers',
      description: 'Référentiel des fabricants de la société active et de leurs logos.',
    },
    { name: 'Suppliers', description: 'Référentiel des fournisseurs de la société active.' },
    { name: 'Materials', description: 'Gestion du parc matériel.' },
    { name: 'Material files', description: 'Photos et documents protégés des matériels.' },
    { name: 'Maintenance', description: 'Plans et historique d’entretien.' },
    { name: 'History', description: 'Historiques consolidés par domaine.' },
    { name: 'Dashboard', description: 'Indicateurs du tableau de bord.' },
    {
      name: 'Relations',
      description: 'Cartographie des relations entre les modèles de la société active.',
    },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: openApiSchemas,
    responses: openApiResponses,
    parameters: openApiParameters,
    headers: openApiHeaders,
  },
  paths: openApiPaths,
};

export default swaggerSpec;
