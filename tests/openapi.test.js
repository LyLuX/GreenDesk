import { describe, expect, it } from '@jest/globals';
import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';

import app from '../src/app.js';
import swaggerSpec from '../src/config/swagger.js';
import { DOCUMENT_TYPES } from '../src/modules/materials/material-file.constants.js';
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

  it('documents Cache-Control on every response', () => {
    for (const pathItem of Object.values(swaggerSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!HTTP_METHODS.has(method)) continue;
        for (const response of Object.values(operation.responses)) {
          const resolvedResponse = response.$ref ? resolveLocalReference(response.$ref) : response;
          const cacheControlHeader = resolvedResponse.headers?.['Cache-Control'];
          const resolvedHeader = cacheControlHeader?.$ref
            ? resolveLocalReference(cacheControlHeader.$ref)
            : cacheControlHeader;
          expect(resolvedHeader).toEqual(swaggerSpec.components.headers.CacheControl);
        }
      }
    }
  });

  it('documents 429 and its quota headers on every rate-limited API operation', () => {
    for (const [path, pathItem] of Object.entries(swaggerSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!HTTP_METHODS.has(method) || path === '/health') continue;
        const rateLimitResponse = operation.responses[429];
        const response = rateLimitResponse.$ref
          ? resolveLocalReference(rateLimitResponse.$ref)
          : rateLimitResponse;

        expect(response).toEqual(swaggerSpec.components.responses.TooManyRequests);
        expect(Object.keys(response.headers)).toEqual(
          expect.arrayContaining(['Retry-After', 'RateLimit', 'RateLimit-Policy']),
        );
      }
    }
  });

  it('keeps proxy trust disabled unless explicit proxies are configured', () => {
    expect(app.get('trust proxy')).toBe(false);
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
    expect(maintenance.intervalDays.minimum).toBe(0);
    expect(maintenance.nextMaintenanceDate.nullable).toBe(true);
    expect(maintenance.status.enum).toContain('wearBased');
    expect(maintenance).toHaveProperty('operation');
    expect(maintenance).toHaveProperty('parts');
    expect(dashboardMaintenance.stockValues.properties).toEqual(
      expect.objectContaining({ onHand: expect.any(Object), onOrder: expect.any(Object) }),
    );
    expect(swaggerSpec.components.schemas.MaintenancePart.properties).toEqual(
      expect.objectContaining({
        manufacturerUuid: expect.any(Object),
        supplierUuid: expect.any(Object),
        supplier: expect.any(Object),
        unitPrice: expect.any(Object),
        totalMaintenanceCost: expect.any(Object),
      }),
    );
    expect(swaggerSpec.components.schemas.MaintenancePartCreateRequest.properties).toHaveProperty(
      'unitPrice',
    );
    expect(swaggerSpec.paths).toHaveProperty('/manufacturers');
    expect(swaggerSpec.paths).toHaveProperty('/suppliers');
    expect(swaggerSpec.paths).not.toHaveProperty('/maintenance/manufacturers');
    expect(swaggerSpec.paths).not.toHaveProperty('/maintenance/suppliers');
    expect(swaggerSpec.paths).toHaveProperty('/maintenance/order-list');
    expect(swaggerSpec.paths).toHaveProperty('/maintenance/sheets');
    expect(swaggerSpec.paths).toHaveProperty('/maintenance/parts/{uuid}/price');
    expect(swaggerSpec.paths).toHaveProperty('/maintenance/parts/{uuid}/minimum-stock');
    expect(swaggerSpec.paths).toHaveProperty('/maintenance/parts/{uuid}/price-history');
    expect(swaggerSpec.paths['/materials/options'].get.responses[200]).toBeDefined();
    expect(
      swaggerSpec.paths['/materials/{uuid}/documents'].post.requestBody.content[
        'multipart/form-data'
      ].schema.properties.documentType.enum,
    ).toEqual(DOCUMENT_TYPES);
    expect(swaggerSpec.components.schemas.MaterialOption.properties).toEqual({
      uuid: expect.any(Object),
      name: expect.any(Object),
      active: expect.any(Object),
    });
    expect(swaggerSpec.paths['/maintenance/operations'].post.description).toContain(
      '`maintenance.operations.create`',
    );
    expect(swaggerSpec.paths['/maintenance/parts'].post.description).toContain(
      '`maintenance.parts.create`',
    );
    expect(swaggerSpec.paths['/maintenance/parts/{uuid}/stock'].patch.description).toContain(
      '`maintenance.parts.stock.adjust_on_hand`',
    );
    expect(swaggerSpec.paths['/maintenance/parts/{uuid}/stock'].patch.description).toContain(
      '`maintenance.parts.stock.adjust_on_order`',
    );
    expect(swaggerSpec.paths['/maintenance/parts/{uuid}/stock'].patch.description).toContain(
      '`maintenance.parts.stock.order`',
    );
    expect(swaggerSpec.paths['/maintenance/parts/{uuid}/stock'].patch.description).toContain(
      '`maintenance.parts.stock.receive`',
    );
    expect(swaggerSpec.paths['/maintenance/parts/{uuid}/price'].patch.description).toContain(
      '`maintenance.parts.price.update`',
    );
    expect(
      swaggerSpec.paths['/maintenance/parts/{uuid}/minimum-stock'].patch.description,
    ).toContain('`maintenance.parts.stock.minimum.update`');
    expect(swaggerSpec.paths['/maintenance/interventions'].post.description).toContain(
      '`maintenance.parts.stock.consume`',
    );
    expect(swaggerSpec.paths['/materials/options'].get.description).toContain(
      '`maintenance.parts.stock.consume`',
    );
    expect(swaggerSpec.components.schemas.DashboardSummary.required).not.toContain('maintenance');
    expect(
      swaggerSpec.components.schemas.HistoryEvent.properties.subject.properties.label.description,
    ).toContain('jamais un UUID technique');
    expect(swaggerSpec.components.schemas.DashboardSummary.properties.fleet.required).toEqual([
      'averageAge',
    ]);
    const requiredDashboardMaintenanceFields =
      swaggerSpec.components.schemas.DashboardSummary.properties.maintenance.required ?? [];
    expect(requiredDashboardMaintenanceFields).not.toContain('stockValues');
    expect(requiredDashboardMaintenanceFields).not.toContain('costs');
    expect(requiredDashboardMaintenanceFields).not.toContain('lowStock');
    expect(
      swaggerSpec.components.schemas.DashboardSummary.properties.maintenance.properties.lowStock
        .description,
    ).toContain('`maintenance.parts.read`');
    expect(swaggerSpec.paths['/dashboard/summary'].get.description).toContain(
      '`dashboard.read.financial`',
    );
    expect(dashboardMaintenance.items.properties).toEqual(
      expect.objectContaining({
        today: expect.any(Object),
        upcoming: expect.any(Object),
        overdue: expect.any(Object),
        wearBased: expect.any(Object),
      }),
    );
    expect(dashboardMaintenance.costs.items.properties).toEqual(
      expect.objectContaining({ year: expect.any(Object), total: expect.any(Object) }),
    );
    expect(
      swaggerSpec.paths['/maintenance/order-list'].get.parameters.find(
        ({ name }) => name === 'includeWearBased',
      )?.schema,
    ).toEqual(expect.objectContaining({ type: 'boolean', default: false }));
    expect(swaggerSpec.paths['/maintenance/sheets'].get.description).toContain(
      '`maintenance.sheets.read`',
    );
    const maintenanceSheetParameters = swaggerSpec.paths['/maintenance/sheets'].get.parameters.map(
      ({ name }) => name,
    );
    expect(maintenanceSheetParameters).toEqual(
      expect.arrayContaining(['status', 'includeOverdue', 'includeWearBased']),
    );
    expect(maintenanceSheetParameters).not.toContain('horizonDays');
    expect(swaggerSpec.paths['/maintenance/sheets'].get.description).toContain(
      'tous les plans actifs',
    );
    expect(
      swaggerSpec.components.schemas.MaintenanceSheetList.properties.items.items.allOf,
    ).toHaveLength(2);
    expect(
      swaggerSpec.paths['/maintenance/order-list'].get.parameters.find(
        ({ name }) => name === 'includeLowStock',
      )?.schema,
    ).toEqual(expect.objectContaining({ type: 'boolean', default: false }));
    expect(
      swaggerSpec.paths['/maintenance/order-list'].get.parameters.find(
        ({ name }) => name === 'lowStockOnly',
      )?.schema,
    ).toEqual(expect.objectContaining({ type: 'boolean', default: false }));
  });

  it('keeps manufacturers limited to their useful business fields', () => {
    const manufacturer = swaggerSpec.components.schemas.Manufacturer.properties;
    const createRequest = swaggerSpec.components.schemas.ManufacturerCreateRequest.properties;

    expect(manufacturer).not.toHaveProperty('description');
    expect(manufacturer).not.toHaveProperty('notes');
    expect(createRequest).toEqual({ name: expect.any(Object) });
  });

  it('documents active-status updates through the existing update requests', () => {
    for (const schemaName of [
      'MaterialUpdateRequest',
      'CategoryUpdateRequest',
      'ManufacturerUpdateRequest',
      'SupplierUpdateRequest',
    ]) {
      expect(swaggerSpec.components.schemas[schemaName].properties.active).toMatchObject({
        type: 'boolean',
      });
    }
    expect(swaggerSpec.paths['/materials/{uuid}'].put.description).toContain(
      '`materials.status.update`',
    );
    expect(swaggerSpec.paths['/categories/{uuid}'].put.description).toContain(
      '`categories.status.update`',
    );
    expect(swaggerSpec.paths['/maintenance/{uuid}/status'].patch.description).toContain(
      '`maintenance.status.update`',
    );
  });

  it('documents the permission-filtered relationship graph modes', () => {
    const operation = swaggerSpec.paths['/relations'].get;
    const mode = operation.parameters.find((parameter) => parameter.name === 'mode');
    const scope = operation.parameters.find((parameter) => parameter.name === 'scope');

    expect(operation.description).toContain('`relations.read`');
    expect(operation.description).toContain('permissions de consultation');
    expect(mode.schema).toEqual({
      type: 'string',
      enum: ['simplified', 'complete'],
      default: 'simplified',
    });
    expect(scope.schema).toEqual({
      type: 'string',
      enum: ['models', 'records'],
      default: 'models',
    });
    expect(swaggerSpec.components.schemas.RelationGraph.properties).toEqual(
      expect.objectContaining({
        scope: expect.any(Object),
        nodes: expect.any(Object),
        edges: expect.any(Object),
      }),
    );
  });

  it('documents granular administration and file permissions', () => {
    expect(swaggerSpec.paths['/users'].get.description).toContain('`users.read`');
    expect(swaggerSpec.paths['/users'].get.description).toContain(
      'dernière connexion décroissante',
    );
    expect(swaggerSpec.paths['/users'].get.description).toContain('`users.deleted.read`');
    expect(swaggerSpec.paths['/users'].get.description).toContain(
      '`users.roles.<nom-du-rôle>.read`',
    );
    expect(swaggerSpec.paths['/users'].get.description).toContain('`users.all.read`');
    expect(swaggerSpec.paths['/users'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'deleted',
          schema: expect.objectContaining({ type: 'boolean' }),
        }),
        expect.objectContaining({
          name: 'includeDeleted',
          schema: expect.objectContaining({ type: 'boolean' }),
        }),
      ]),
    );
    expect(swaggerSpec.paths['/users/{uuid}/restore'].post.description).toContain(
      '`users.deleted.update`',
    );
    expect(swaggerSpec.paths['/users/{uuid}/restore'].post.responses).toHaveProperty('409');
    expect(swaggerSpec.components.schemas.User.properties.deletedAt.description).toContain(
      'restauration',
    );
    expect(swaggerSpec.paths['/companies'].get.description).toContain('`companies.deleted.read`');
    expect(swaggerSpec.paths['/companies'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'deleted',
          schema: expect.objectContaining({ type: 'boolean' }),
        }),
        expect.objectContaining({
          name: 'includeDeleted',
          schema: expect.objectContaining({ type: 'boolean' }),
        }),
      ]),
    );
    expect(swaggerSpec.paths['/companies/{uuid}/restore'].post.description).toContain(
      '`companies.deleted.update`',
    );
    expect(swaggerSpec.paths['/companies/{uuid}/restore'].post.responses).toHaveProperty('409');
    expect(swaggerSpec.components.schemas.Company.properties.deletedAt.description).toContain(
      'restauration',
    );
    expect(swaggerSpec.paths['/users/{uuid}'].put.description).toContain('`users.password.update`');
    expect(swaggerSpec.paths['/roles/{uuid}'].put.description).toContain(
      '`roles.permissions.update`',
    );
    expect(swaggerSpec.paths['/roles/{uuid}'].put.description).toContain(
      'nom du rôle est immuable',
    );
    expect(swaggerSpec.components.schemas.RoleUpdateRequest.properties).not.toHaveProperty('name');
    expect(swaggerSpec.components.schemas.Permission.properties.name.maxLength).toBe(150);
    expect(swaggerSpec.components.schemas.PermissionCreateRequest.properties.name.maxLength).toBe(
      150,
    );
    expect(swaggerSpec.paths['/permissions'].post.description).toContain('`permissions.create`');
    expect(swaggerSpec.paths['/permissions'].post.description).toContain(
      '`users.roles.<nom-du-rôle>.read`',
    );
    expect(swaggerSpec.paths['/manufacturers/{uuid}/logo'].post.description).toContain(
      '`manufacturers.logo.upload`',
    );
    expect(swaggerSpec.paths['/materials/{uuid}/photos'].post.description).toContain(
      '`materials.photos.create`',
    );
    expect(
      swaggerSpec.paths['/materials/{uuid}/photos'].post.requestBody.content[
        'multipart/form-data'
      ].schema.properties.name,
    ).toEqual(expect.objectContaining({ type: 'string', maxLength: 150 }));
    expect(swaggerSpec.components.schemas.MaterialFile.properties.name).toEqual(
      expect.objectContaining({ type: 'string', maxLength: 150, nullable: true }),
    );
    expect(swaggerSpec.paths['/materials/files/{fileUuid}'].delete.description).toContain(
      '`materials.files.delete`',
    );
  });

  it('documents server-side uppercase normalization for user last names', () => {
    expect(swaggerSpec.paths['/auth/register'].post.description).toContain(
      'nom de famille est stocké en majuscules',
    );
    expect(swaggerSpec.paths['/users'].post.description).toContain(
      'nom de famille est stocké en majuscules',
    );
    expect(swaggerSpec.paths['/users/{uuid}'].put.description).toContain(
      'nom de famille est stocké en majuscules',
    );
    expect(swaggerSpec.components.schemas.User.properties.lastName.description).toContain(
      'majuscules',
    );
    expect(
      swaggerSpec.components.schemas.RegisterRequest.properties.lastName.description,
    ).toContain('majuscules');
    expect(
      swaggerSpec.components.schemas.UserUpdateRequest.properties.lastName.description,
    ).toContain('majuscules');
  });

  it('documents the default material catalogue sort', () => {
    const parameters = swaggerSpec.paths['/materials'].get.parameters;
    const sort = parameters.find((parameter) => parameter.name === 'sort');
    const direction = parameters.find((parameter) => parameter.name === 'direction');

    expect(sort.schema.default).toBe('purchaseDate');
    expect(direction.schema.default).toBe('DESC');
  });

  it('documents the maintenance-part stock filter', () => {
    const parameters = swaggerSpec.paths['/maintenance/parts'].get.parameters;
    const stockStatus = parameters.find((parameter) => parameter.name === 'stockStatus');

    expect(stockStatus.schema.enum).toEqual(['inStock', 'toOrder', 'ordered']);
  });

  it('documents maintenance execution without replacing parts', () => {
    const executeRequest = swaggerSpec.components.schemas.MaintenanceExecuteRequest;
    const history = swaggerSpec.components.schemas.MaintenanceHistory;

    expect(executeRequest.properties.partsAction).toMatchObject({
      enum: ['consume', 'partial', 'skip'],
      default: 'consume',
    });
    expect(executeRequest.properties.comment.description).toContain('partial');
    expect(executeRequest.properties.partUuids).toMatchObject({
      type: 'array',
      minItems: 1,
      uniqueItems: true,
    });
    expect(executeRequest.properties.partsAction.description).toContain(
      'maintenance.execute.skip_parts',
    );
    expect(history.properties.executionType.enum).toEqual([
      'standard',
      'partialPartReplacement',
      'withoutPartReplacement',
    ]);
    expect(history.properties.partsSnapshot.items.properties.quantity).toMatchObject({
      type: 'number',
      minimum: 0.01,
      multipleOf: 0.01,
    });
    expect(swaggerSpec.paths['/maintenance/{uuid}/execute'].post.description).toContain(
      'pièces non remplacées',
    );
    expect(swaggerSpec.paths['/maintenance/{uuid}/execute'].post.description).toContain(
      'partsAction=partial',
    );
    expect(swaggerSpec.paths['/maintenance/{uuid}/execute'].post.description).toContain(
      'maintenance.execute.skip_parts',
    );
  });

  it('documents unplanned maintenance interventions and their consumed parts', () => {
    const request = swaggerSpec.components.schemas.MaintenanceInterventionCreateRequest;
    const intervention = swaggerSpec.components.schemas.MaintenanceIntervention;

    expect(request.required).toEqual(['materialUuid', 'description', 'parts']);
    expect(request.properties.parts.minItems).toBe(1);
    expect(intervention.required).toContain('totalCost');
    expect(swaggerSpec.paths['/maintenance/interventions'].get.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'materialUuid', in: 'query' })]),
    );
  });

  it('documents lifecycle conflicts between materials and maintenance plans', () => {
    expect(swaggerSpec.paths['/materials/{uuid}'].put.description).toContain(
      'plans actifs associés',
    );
    expect(swaggerSpec.paths['/materials/{uuid}'].delete.responses).toHaveProperty('409');
    expect(swaggerSpec.paths['/maintenance/{uuid}/status'].patch.responses).toHaveProperty('409');
    expect(swaggerSpec.paths['/maintenance/{uuid}/execute'].post.responses).toHaveProperty('409');
  });

  it('documents session invalidation after authorization changes', () => {
    expect(swaggerSpec.paths['/users/{uuid}'].put.description).toContain(
      'invalide les sessions actives',
    );
    expect(swaggerSpec.paths['/roles/{uuid}'].put.description).toContain(
      'exception de la session de l’administrateur',
    );
    expect(swaggerSpec.paths['/roles/{uuid}'].delete.description).toContain(
      'invalide les sessions actives',
    );
  });

  it('documents binary-signature validation on every upload endpoint', () => {
    for (const operation of [
      swaggerSpec.paths['/manufacturers/{uuid}/logo'].post,
      swaggerSpec.paths['/materials/{uuid}/photos'].post,
      swaggerSpec.paths['/materials/{uuid}/documents'].post,
    ]) {
      expect(operation.description).toContain('signature binaire');
      expect(operation.responses).toHaveProperty('400');
    }
  });
});
