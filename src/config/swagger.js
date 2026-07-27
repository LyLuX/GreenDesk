import { openApiParameters, openApiResponses, openApiSchemas } from './openapi-components.js';
import { openApiPaths } from './openapi-paths.js';

/** OpenAPI contract served by Swagger UI. */
const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'GreenDesk API',
    version: '1.0.0',
    description:
      'Contrat de l’API GreenDesk. Les routes sans préfixe dans cette documentation utilisent le serveur `/api/v1`. Les alias historiques sous `/api` restent disponibles pour compatibilité mais sont dépréciés.',
  },
  servers: [{ url: '/api/v1', description: 'Version 1 API' }],
  tags: [
    { name: 'System', description: 'État et point d’entrée de l’API.' },
    { name: 'Auth', description: 'Authentification et cycle de session JWT.' },
    { name: 'Users', description: 'Administration des utilisateurs.' },
    { name: 'Roles', description: 'Administration des rôles.' },
    { name: 'Permissions', description: 'Administration des permissions.' },
    { name: 'Categories', description: 'Référentiel des catégories.' },
    {
      name: 'Manufacturers',
      description: 'Référentiel global des fabricants et de leurs logos.',
    },
    { name: 'Suppliers', description: 'Référentiel global des fournisseurs.' },
    { name: 'Materials', description: 'Gestion du parc matériel.' },
    { name: 'Material files', description: 'Photos et documents protégés des matériels.' },
    { name: 'Maintenance', description: 'Plans et historique d’entretien.' },
    { name: 'Dashboard', description: 'Indicateurs du tableau de bord.' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: openApiSchemas,
    responses: openApiResponses,
    parameters: openApiParameters,
  },
  paths: openApiPaths,
};

export default swaggerSpec;
