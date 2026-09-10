import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { QueryTypes } from 'sequelize';

import sequelize from '../src/config/database.js';
import { runWithCompanyScope } from '../src/core/company/company-context.js';
import MaterialPartRelationsRepository from '../src/modules/relations/repository/material-part-relations.repository.js';
import MaterialPartRelationsService from '../src/modules/relations/service/material-part-relations.service.js';
import RelationsService from '../src/modules/relations/service/relations.service.js';
import { relationGraphValidator } from '../src/modules/relations/validator/relations.validator.js';
import { validationResult } from 'express-validator';

const permissions = ['materials.read', 'maintenance.read', 'maintenance.parts.read'];
const makeRepository = () => ({
  getCompany: jest.fn().mockResolvedValue({ uuid: 'company', name: 'Alpha' }),
  getMaterials: jest.fn().mockResolvedValue([
    {
      uuid: 'mower',
      name: 'Tondeuse',
      model: 'M1',
      serialNumber: 'S1',
      categoryUuid: 'garden',
      categoryName: 'Jardin',
    },
    { uuid: 'tractor', name: 'Tracteur', categoryUuid: 'garden', categoryName: 'Jardin' },
    { uuid: 'unused', name: 'Matériel sans pièce', categoryUuid: 'empty', categoryName: 'Vide' },
  ]),
  getRelationships: jest.fn().mockResolvedValue([
    {
      materialUuid: 'mower',
      partUuid: 'oil',
      partName: 'Huile',
      partReference: 'H1',
      cataloguePart: 1,
      planned: 1,
      unit: 'litre',
      consumedQuantity: '1.75',
      lastUsedAt: '2026-09-09',
    },
    {
      materialUuid: 'mower',
      partUuid: 'oil',
      partName: 'Huile',
      partReference: 'H1',
      cataloguePart: 1,
      planned: 0,
      unit: 'bidon',
      consumedQuantity: '2.00',
      lastUsedAt: '2026-08-01',
    },
    {
      materialUuid: 'tractor',
      partUuid: 'oil',
      partName: 'Huile',
      partReference: 'H1',
      cataloguePart: 1,
      planned: 1,
      unit: 'litre',
      consumedQuantity: '0',
      lastUsedAt: null,
    },
    {
      materialUuid: 'mower',
      partUuid: 'deleted',
      partName: 'Ancien filtre',
      partReference: 'F1',
      cataloguePart: 0,
      planned: 0,
      unit: 'pièce',
      consumedQuantity: '3.00',
      lastUsedAt: '2026-07-01',
    },
  ]),
});

describe('Material–part relationships', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shares parts across materials and separates planned links from actual consumption by unit', async () => {
    const graph = await new MaterialPartRelationsService(makeRepository()).getGraph({
      permissions: [...permissions, 'categories.read'],
    });
    expect(graph.scope).toBe('materialParts');
    expect(graph.nodes.find(({ id }) => id === 'material:mower').description).toBe('M1 · S1');
    expect(graph.nodes.map(({ id }) => id)).toEqual([
      'company',
      'category:garden',
      'material:mower',
      'material:tractor',
      'part:oil',
      'part:deleted',
    ]);
    expect(graph.nodes[0]).toMatchObject({ materialCount: 2, partCount: 2 });
    expect(graph.nodes.find(({ id }) => id === 'category:garden')).toMatchObject({
      count: 2,
      label: 'Jardin',
    });
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'company', target: 'category:garden' }),
        expect.objectContaining({ source: 'category:garden', target: 'material:mower' }),
      ]),
    );
    expect(
      graph.edges.find(
        ({ source, target }) => source === 'material:mower' && target === 'part:oil',
      ),
    ).toMatchObject({
      planned: true,
      label: 'Prévue et consommée',
      consumptions: [
        { quantity: 1.75, unit: 'litre', lastUsedAt: '2026-09-09' },
        { quantity: 2, unit: 'bidon', lastUsedAt: '2026-08-01' },
      ],
    });
    expect(
      graph.edges.find(
        ({ source, target }) => source === 'material:tractor' && target === 'part:oil',
      ),
    ).toMatchObject({ planned: true, label: 'Prévue', consumptions: [] });
    expect(graph.edges.find(({ target }) => target === 'part:deleted')).toMatchObject({
      planned: false,
      label: 'Consommée',
    });
    const deletedPart = graph.nodes.find(({ id }) => id === 'part:deleted');
    expect(deletedPart.description).toContain('Pièce supprimée');
    expect(deletedPart.path).toBeUndefined();
  });

  it.each(permissions)('does not query or expose associations without %s', async (missing) => {
    const repository = makeRepository();
    const graph = await new MaterialPartRelationsService(repository).getGraph({
      permissions: permissions.filter((permission) => permission !== missing),
    });
    expect(repository.getRelationships).not.toHaveBeenCalled();
    expect(graph.nodes.some(({ recordType }) => recordType === 'part')).toBe(false);
    expect(graph.nodes.some(({ plansPath }) => plansPath)).toBe(false);
    if (missing === 'materials.read') {
      expect(repository.getMaterials).not.toHaveBeenCalled();
      expect(graph.nodes).toHaveLength(1);
    }
  });

  it('accepts the additive API scope and forwards permissions to its service', async () => {
    const request = { query: { scope: 'materialParts' } };
    await Promise.all(relationGraphValidator.map((validator) => validator.run(request)));
    expect(validationResult(request).isEmpty()).toBe(true);
    const service = { getGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }) };
    await new RelationsService({}, {}, service).getGraph({ scope: 'materialParts', permissions });
    expect(service.getGraph).toHaveBeenCalledWith({ mode: 'simplified', permissions });
  });

  it('does not expose category names without their permission', async () => {
    const repository = makeRepository();
    const graph = await new MaterialPartRelationsService(repository).getGraph({ permissions });
    expect(repository.getMaterials).toHaveBeenCalledWith({ includeCategories: false });
    expect(graph.nodes.some(({ id }) => id.startsWith('category:'))).toBe(false);
    expect(JSON.stringify(graph)).not.toContain('Jardin');
    expect(graph.nodes.find(({ id }) => id === 'materials')).toMatchObject({
      label: 'Matériels',
      count: 2,
    });
  });

  it('keeps consumed-only materials under a fallback category and omits empty categories', async () => {
    const repository = makeRepository();
    repository.getRelationships.mockResolvedValue([
      {
        materialUuid: 'tractor',
        partUuid: 'old',
        partName: 'Ancienne pièce',
        partReference: 'P1',
        cataloguePart: 0,
        planned: 0,
        consumedQuantity: '2',
        unit: 'pièce',
        lastUsedAt: '2026-09-09',
      },
    ]);
    repository.getMaterials.mockResolvedValue([
      { uuid: 'tractor', name: 'Tracteur' },
      { uuid: 'empty', name: 'Sans lien', categoryUuid: 'empty', categoryName: 'Vide' },
    ]);
    const graph = await new MaterialPartRelationsService(repository).getGraph({
      permissions: [...permissions, 'categories.read'],
    });
    expect(graph.nodes.map(({ id }) => id)).toEqual([
      'company',
      'category:none',
      'material:tractor',
      'part:old',
    ]);
    expect(graph.nodes[1].label).toBe('Sans catégorie');
    expect(graph.nodes[0]).toMatchObject({ materialCount: 1, partCount: 1 });
  });

  it('returns only the company with zero counts when no planned or consumed parts exist', async () => {
    const repository = makeRepository();
    repository.getRelationships.mockResolvedValue([]);
    const graph = await new MaterialPartRelationsService(repository).getGraph({ permissions });
    expect(graph.nodes).toEqual([
      expect.objectContaining({ id: 'company', materialCount: 0, partCount: 0 }),
    ]);
    expect(graph.edges).toEqual([]);
  });

  it('only joins readable categories within the selected company', async () => {
    const query = jest.spyOn(sequelize, 'query').mockResolvedValue([]);
    const repository = new MaterialPartRelationsRepository();
    await runWithCompanyScope({ companyId: 42 }, () =>
      repository.getMaterials({ includeCategories: true }),
    );
    expect(query.mock.calls[0][0]).toContain('c.company_id = $companyId');
    expect(query.mock.calls[0][0]).toContain('c.deleted_at IS NULL');
    expect(query.mock.calls[0][0]).toContain('ORDER BY c.name, m.name, m.id');
    await runWithCompanyScope({ companyId: 42 }, () => repository.getMaterials());
    expect(query.mock.calls[1][0]).not.toContain('categories');
  });

  it('aggregates all three sources in SQL with company bindings on every joined resource', async () => {
    const query = jest.spyOn(sequelize, 'query').mockResolvedValue([]);
    const repository = new MaterialPartRelationsRepository();
    await runWithCompanyScope({ companyId: 42 }, async () => {
      await repository.getMaterials();
      await repository.getRelationships();
    });
    expect(query).toHaveBeenCalledTimes(2);
    for (const [, options] of query.mock.calls)
      expect(options).toEqual({ bind: { companyId: 42 }, type: QueryTypes.SELECT });
    const sql = query.mock.calls[1][0];
    expect(sql.match(/UNION ALL/g)).toHaveLength(2);
    for (const alias of ['tp', 't', 'm', 'p', 'u', 'h', 'i'])
      expect(sql).toContain(`${alias}.company_id = $companyId`);
    expect(sql).toContain('SUM(quantity) AS consumedQuantity');
    expect(sql).toContain('MAX(performedAt) AS lastUsedAt');
    expect(sql).toContain('GROUP BY materialUuid, partUuid, unit');
    const [planned, history, intervention] = sql.split('UNION ALL');
    expect(planned).toContain('t.active = 1');
    expect(planned).toContain('t.deleted_at IS NULL');
    expect(history).not.toContain('t.deleted_at');
    expect(history).toContain('u.quantity');
    expect(intervention).toContain('u.quantity');
    expect(sql).not.toContain('unit_price');
    expect(sql).not.toContain('total_cost');
  });

  it('requires a company before any aggregate query', async () => {
    const query = jest.spyOn(sequelize, 'query').mockResolvedValue([]);
    await expect(new MaterialPartRelationsRepository().getRelationships()).rejects.toThrow(
      'Un contexte de société est requis.',
    );
    expect(query).not.toHaveBeenCalled();
  });
});
