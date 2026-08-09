import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { mountApiDocumentation } from './config/api-docs.js';
import { createCorsOptions } from './config/cors.js';
import env from './config/env.js';
import { compressionOptions, helmetOptions } from './config/http-middleware.js';
import logger from './core/logger/logger.js';
import { createCacheControlMiddleware } from './core/middlewares/cache-control.middleware.js';
import { errorHandler, notFoundHandler } from './core/middlewares/error-handler.js';
import { apiRateLimiter } from './core/middlewares/rate-limit.middleware.js';
import { requestId } from './core/utils/request-id.js';
import { routeRegistry } from './routes/route-registry.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustedProxies);
app.use(helmet(helmetOptions));
app.use(createCacheControlMiddleware(env.nodeEnv));
app.use(compression(compressionOptions));
app.use(cors(createCorsOptions()));
app.use(requestId);
app.use('/api', apiRateLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (message) => logger.http(message.trim()) },
  }),
);

mountApiDocumentation(app, env.apiDocs.enabled);
for (const { mountPath, router } of routeRegistry) app.use(mountPath, router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
