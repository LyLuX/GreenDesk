import apiRoutes from './index.js';
import healthRoutes from './health.routes.js';
import authRoutes from '../modules/auth/routes/auth.routes.js';
import categoryRoutes from '../modules/categories/routes/category.routes.js';
import dashboardRoutes from '../modules/dashboard/routes/dashboard.routes.js';
import maintenanceRoutes from '../modules/maintenance/routes/maintenance.routes.js';
import manufacturerRoutes from '../modules/manufacturers/routes/manufacturer.routes.js';
import materialFileRoutes from '../modules/materials/routes/material-file.routes.js';
import materialRoutes from '../modules/materials/routes/material.routes.js';
import permissionRoutes from '../modules/permissions/routes/permission.routes.js';
import roleRoutes from '../modules/roles/routes/role.routes.js';
import supplierRoutes from '../modules/suppliers/routes/supplier.routes.js';
import userRoutes from '../modules/users/routes/user.routes.js';

/**
 * Single source of truth for mounted HTTP routers.
 * `openApiBasePath` is relative to the documented `/api/v1` server, except for
 * standalone routes such as `/health`. Compatibility aliases are explicitly
 * marked and described in OpenAPI without duplicating every operation.
 */
export const routeRegistry = [
  { mountPath: '/health', router: healthRoutes, openApiBasePath: '/health' },
  { mountPath: '/api/v1', router: apiRoutes, openApiBasePath: '/' },
  { mountPath: '/api/v1/auth', router: authRoutes, openApiBasePath: '/auth' },
  { mountPath: '/api/v1/users', router: userRoutes, openApiBasePath: '/users' },
  { mountPath: '/api/v1/roles', router: roleRoutes, openApiBasePath: '/roles' },
  {
    mountPath: '/api/v1/permissions',
    router: permissionRoutes,
    openApiBasePath: '/permissions',
  },
  { mountPath: '/api/categories', router: categoryRoutes, deprecatedAlias: true },
  { mountPath: '/api/materials', router: materialRoutes, deprecatedAlias: true },
  { mountPath: '/api/dashboard', router: dashboardRoutes, deprecatedAlias: true },
  { mountPath: '/api/v1/categories', router: categoryRoutes, openApiBasePath: '/categories' },
  { mountPath: '/api/v1/materials', router: materialRoutes, openApiBasePath: '/materials' },
  {
    mountPath: '/api/v1/materials',
    router: materialFileRoutes,
    openApiBasePath: '/materials',
  },
  { mountPath: '/api/v1/dashboard', router: dashboardRoutes, openApiBasePath: '/dashboard' },
  {
    mountPath: '/api/v1/manufacturers',
    router: manufacturerRoutes,
    openApiBasePath: '/manufacturers',
  },
  { mountPath: '/api/v1/brands', router: manufacturerRoutes, deprecatedAlias: true },
  { mountPath: '/api/brands', router: manufacturerRoutes, deprecatedAlias: true },
  {
    mountPath: '/api/v1/maintenance/manufacturers',
    router: manufacturerRoutes,
    deprecatedAlias: true,
  },
  {
    mountPath: '/api/maintenance/manufacturers',
    router: manufacturerRoutes,
    deprecatedAlias: true,
  },
  { mountPath: '/api/v1/suppliers', router: supplierRoutes, openApiBasePath: '/suppliers' },
  {
    mountPath: '/api/v1/maintenance/suppliers',
    router: supplierRoutes,
    deprecatedAlias: true,
  },
  {
    mountPath: '/api/maintenance/suppliers',
    router: supplierRoutes,
    deprecatedAlias: true,
  },
  {
    mountPath: '/api/v1/maintenance',
    router: maintenanceRoutes,
    openApiBasePath: '/maintenance',
  },
  { mountPath: '/api/maintenance', router: maintenanceRoutes, deprecatedAlias: true },
];
