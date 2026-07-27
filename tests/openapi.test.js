import { describe, expect, it } from '@jest/globals';
import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';

import app from '../src/app.js';
import swaggerSpec from '../src/config/swagger.js';
import { routeRegistry } from '../src/routes/route-registry.js';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

const normalizePath = (basePath, routePath) => {
  const base = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  const child = routePath === '/' ? '' : routePath;
  return `${base}${child || ''}`.replace(/:([A-Za-z0-9_]+)/g, '{$1}') || '/';
};

const runtimeOperations = () =>
  routeRegistry
    .filter(({ openApiBasePath }) => openApiBasePath)
    .flatMap(({ openApiBasePath, router }) =>
      router.stack
        .filter(({ route }) => route)
        .flatMap(({ route }) =>
          Object.keys(route.methods)
            .filter((method) => HTTP_METHODS.has(method))
            .map(
              (method) => `${method.toUpperCase()} ${normalizePath(openApiBasePath, route.path)}`,
            ),
        ),
    )
    .sort();

const documentedOperations = () =>
  Object.entries(swaggerSpec.paths)
    .flatMap(([path, pathItem]) =>
      Object.keys(pathItem)
        .filter((method) => HTTP_METHODS.has(method))
        .map((method) => `${method.toUpperCase()} ${path}`),
    )
    .sort();

const resolveLocalReference = (reference) =>
  reference
    .slice(2)
    .split('/')
    .reduce((value, key) => value?.[key], swaggerSpec);

describe('OpenAPI contract', () => {
  it('is a valid OpenAPI 3 document', async () => {
    await expect(SwaggerParser.validate(swaggerSpec)).resolves.toBeDefined();
  });

  it('serves the exact contract used by Swagger UI', async () => {
    const response = await request(app).get('/docs/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(swaggerSpec);
  });

  it('documents every canonical runtime operation exactly once', () => {
    expect(documentedOperations()).toEqual(runtimeOperations());
  });

  it('keeps every compatibility alias linked to a canonical router', () => {
    const canonicalRouters = new Set(
      routeRegistry.filter(({ openApiBasePath }) => openApiBasePath).map(({ router }) => router),
    );
    const aliases = routeRegistry.filter(({ deprecatedAlias }) => deprecatedAlias);

    expect(aliases.length).toBeGreaterThan(0);
    expect(aliases.every(({ router }) => canonicalRouters.has(router))).toBe(true);
  });

  it('defines responses and a unique operationId for every operation', () => {
    const operationIds = [];

    for (const pathItem of Object.values(swaggerSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!HTTP_METHODS.has(method)) continue;
        expect(operation.responses).toBeDefined();
        expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
        expect(operation.operationId).toBeTruthy();
        operationIds.push(operation.operationId);
      }
    }

    expect(new Set(operationIds).size).toBe(operationIds.length);
  });

  it('contains no broken local component reference', () => {
    const brokenReferences = [];
    const visit = (value) => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
        if (!resolveLocalReference(value.$ref)) brokenReferences.push(value.$ref);
      }
      for (const child of Object.values(value)) visit(child);
    };

    visit(swaggerSpec);
    expect(brokenReferences).toEqual([]);
  });

  it('documents current maintenance data without engine-hour fields', () => {
    const serializedSpec = JSON.stringify(swaggerSpec);
    const maintenance = swaggerSpec.components.schemas.MaintenanceTask.properties;
    const material = swaggerSpec.components.schemas.Material.properties;
    const dashboardMaintenance =
      swaggerSpec.components.schemas.DashboardSummary.properties.maintenance.properties;

    expect(serializedSpec).not.toMatch(/engine.?hours?/i);
    expect(material.purchasePrice.type).toBe('string');
    expect(maintenance).toHaveProperty('intervalDays');
    expect(maintenance).toHaveProperty('nextMaintenanceDate');
    expect(maintenance).toHaveProperty('operation');
    expect(maintenance).toHaveProperty('parts');
    expect(swaggerSpec.components.schemas.MaintenancePart.properties).toEqual(
      expect.objectContaining({
        manufacturerUuid: expect.any(Object),
        supplierUuid: expect.any(Object),
        supplier: expect.any(Object),
      }),
    );
    expect(swaggerSpec.paths).toHaveProperty('/maintenance/manufacturers');
    expect(swaggerSpec.paths).toHaveProperty('/maintenance/suppliers');
    expect(swaggerSpec.paths).toHaveProperty('/maintenance/order-list');
    expect(dashboardMaintenance.items.properties).toEqual(
      expect.objectContaining({
        today: expect.any(Object),
        upcoming: expect.any(Object),
        overdue: expect.any(Object),
      }),
    );
  });
});
