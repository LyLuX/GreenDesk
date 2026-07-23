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
import healthRoutes from './routes/health.routes.js';
import apiRoutes from './routes/index.js';
import authRoutes from './modules/auth/routes/auth.routes.js';
import permissionRoutes from './modules/permissions/routes/permission.routes.js';
import roleRoutes from './modules/roles/routes/role.routes.js';
import userRoutes from './modules/users/routes/user.routes.js';
import categoryRoutes from './modules/categories/routes/category.routes.js';
import propertyRoutes from './modules/properties/routes/property.routes.js';
import materialRoutes from './modules/materials/routes/material.routes.js';
import dashboardRoutes from './modules/dashboard/routes/dashboard.routes.js';

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

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.use('/health', healthRoutes);
app.use('/api/v1', apiRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/materials', materialRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
