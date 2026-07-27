import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import swaggerSpec from './config/swagger.js';
import logger from './core/logger/logger.js';
import { errorHandler, notFoundHandler } from './core/middlewares/error-handler.js';
import { requestId } from './core/utils/request-id.js';
import { routeRegistry } from './routes/route-registry.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestId);
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (message) => logger.http(message.trim()) },
  }),
);

app.get('/docs/openapi.json', (_request, response) => response.json(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
for (const { mountPath, router } of routeRegistry) app.use(mountPath, router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
