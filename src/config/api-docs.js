import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';

import swaggerSpec from './swagger.js';
import { createApiDocsHelmetOptions } from './http-middleware.js';

/** Mounts API documentation only when the runtime environment allows its exposure. */
export function mountApiDocumentation(application, enabled, specification = swaggerSpec) {
  if (!enabled) return;

  const options = { explorer: true };
  const document = swaggerUi.generateHTML(specification, options);
  application.use('/docs', helmet(createApiDocsHelmetOptions(document)));
  application.get('/docs/openapi.json', (_request, response) => response.json(specification));
  application.use('/docs', swaggerUi.serve, swaggerUi.setup(specification, options));
}
