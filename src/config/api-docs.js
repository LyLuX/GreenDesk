import swaggerUi from 'swagger-ui-express';

import swaggerSpec from './swagger.js';

/** Mounts API documentation only when the runtime environment allows its exposure. */
export function mountApiDocumentation(application, enabled, specification = swaggerSpec) {
  if (!enabled) return;

  application.get('/docs/openapi.json', (_request, response) => response.json(specification));
  application.use('/docs', swaggerUi.serve, swaggerUi.setup(specification, { explorer: true }));
}
