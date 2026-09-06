import { randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../../src/app.js';
import env from '../../src/config/env.js';
import sequelize from '../../src/config/database.js';
import { initializeModels } from '../../src/core/database/models.js';
import IdempotencyKey from '../../src/core/idempotency/idempotency-key.model.js';
import StockMovement from '../../src/core/inventory/stock-movement.model.js';
import logger from '../../src/core/logger/logger.js';
import AuditLog from '../../src/modules/audit/model/audit-log.model.js';
import Company from '../../src/modules/companies/model/company.model.js';
import Material from '../../src/modules/materials/model/material.model.js';
import User from '../../src/modules/users/model/user.model.js';
import MaintenanceTask from '../../src/modules/maintenance/model/maintenance-task.model.js';
import MaintenanceTaskPart from '../../src/modules/maintenance/model/maintenance-task-part.model.js';
import MaintenancePart from '../../src/modules/maintenance/model/maintenance-part.model.js';
import MaintenanceHistory from '../../src/modules/maintenance/model/maintenance-history.model.js';
import MaintenanceIntervention from '../../src/modules/maintenance/model/maintenance-intervention.model.js';
import MaintenancePartUsage from '../../src/modules/maintenance/model/maintenance-part-usage.model.js';

const performedAt = '2026-01-02';
const trackedModels = {
  parts: MaintenancePart,
  tasks: MaintenanceTask,
  history: MaintenanceHistory,
  interventions: MaintenanceIntervention,
  usages: MaintenancePartUsage,
  movements: StockMovement,
  audits: AuditLog,
  keys: IdempotencyKey,
};
const cases = [
  {
    name: 'exécution de plan',
    method: 'post',
    status: 200,
    permission: 'maintenance.execute',
    path: ({ task }) => `/api/v1/maintenance/${task.uuid}/execute`,
    body: () => ({ performedAt, partsAction: 'consume', comment: 'Entretien de test' }),
    changed: (body) => ({ ...body, comment: 'Autre entretien' }),
    consumes: true,
  },
  {
    name: 'intervention ponctuelle',
    method: 'post',
    status: 201,
    permission: 'maintenance.parts.stock.consume',
    path: () => '/api/v1/maintenance/interventions',
    body: ({ material, parts }) => ({
      performedAt,
      materialUuid: material.uuid,
      description: 'Intervention de test',
      parts: parts.map((part, index) => ({ partUuid: part.uuid, quantity: index ? 1.25 : 2.5 })),
    }),
    changed: (body) => ({
      ...body,
      parts: body.parts.map((part, index) => (index ? part : { ...part, quantity: 5 })),
    }),
    consumes: true,
  },
  {
    name: 'mouvement de stock',
    method: 'patch',
    status: 200,
    permission: 'maintenance.parts.stock.order',
    path: ({ parts }) => `/api/v1/maintenance/parts/${parts[0].uuid}/stock`,
    body: () => ({ performedAt, operation: 'order', quantity: 2.5 }),
    changed: (body) => ({ ...body, quantity: 5 }),
    consumes: false,
  },
];

async function fixture(existingUser) {
  const company = await Company.create({ name: `Société test ${randomUUID()}` });
  const user =
    existingUser ??
    (await User.create({
      firstName: 'Test',
      lastName: 'Adverse',
      email: `${randomUUID()}@example.invalid`,
      passwordHash: 'unused-integration-test-password',
      emailVerifiedAt: new Date(),
    }));
  await user.addCompany(company);
  const material = await Material.create({
    companyId: company.id,
    name: 'Matériel test',
    unit: 'pièce',
  });
  const parts = await Promise.all(
    [0, 1].map((index) =>
      MaintenancePart.create({
        companyId: company.id,
        name: `Pièce ${index}`,
        reference: `REF-${index}`,
        quantityOnHand: 10,
        unitPrice: 4,
      }),
    ),
  );
  const task = await MaintenanceTask.create({
    companyId: company.id,
    materialId: material.id,
    title: 'Plan de test',
    maintenanceType: 'preventive',
    intervalDays: 30,
    lastMaintenanceDate: '2026-01-01',
    nextMaintenanceDate: '2026-01-31',
  });
  await MaintenanceTaskPart.bulkCreate(
    parts.map((part, index) => ({
      companyId: company.id,
      maintenanceTaskId: task.id,
      maintenancePartId: part.id,
      quantity: index ? 1.25 : 2.5,
    })),
  );
  return { company, user, material, parts, task };
}

function tokenFor(fixture, permissions, companies = [fixture.company]) {
  return jwt.sign(
    {
      sub: fixture.user.uuid,
      userId: Number(fixture.user.id),
      authorizationVersion: 0,
      jti: randomUUID(),
      permissions,
      companyAccess: companies.map(({ id, uuid }) => ({ id: Number(id), uuid })),
    },
    env.jwt.secret,
    { expiresIn: '5m' },
  );
}

function send(
  scenario,
  fixture,
  key,
  {
    body = scenario.body(fixture),
    token = tokenFor(fixture, [scenario.permission]),
    company = fixture.company,
    target = app,
  } = {},
) {
  return request(target)
    [scenario.method](scenario.path(fixture))
    .set('Authorization', `Bearer ${token}`)
    .set('X-Company-Uuid', company.uuid)
    .set('Idempotency-Key', key)
    .send(body)
    .timeout({ response: 15000, deadline: 20000 });
}

async function snapshot(fixture, transaction = null) {
  const entries = await Promise.all(
    Object.entries(trackedModels).map(async ([name, model]) => [
      name,
      await model.findAll({
        where: { companyId: fixture.company.id },
        order: [[name === 'parts' ? 'reference' : 'id', 'ASC']],
        paranoid: false,
        raw: true,
        transaction,
      }),
    ]),
  );
  return JSON.parse(JSON.stringify(Object.fromEntries(entries)));
}

function expectOneWrite(state, scenario, response) {
  expect(state.keys).toHaveLength(1);
  expect(state.keys[0].responseStatus).toBe(scenario.status);
  expect(state.keys[0].responseBody).toEqual(response.body);
  expect(state.audits).toHaveLength(1);
  expect(state.movements).toHaveLength(scenario.consumes ? 2 : 1);
  expect(state.usages).toHaveLength(scenario.consumes ? 2 : 0);
  expect(state.history).toHaveLength(scenario === cases[0] ? 1 : 0);
  expect(state.interventions).toHaveLength(scenario === cases[1] ? 1 : 0);
  expect(state.parts.map((part) => Number(part.quantityOnHand))).toEqual(
    scenario.consumes ? [7.5, 8.75] : [10, 10],
  );
  expect(state.parts.map((part) => Number(part.quantityOnOrder))).toEqual(
    scenario.consumes ? [0, 0] : [2.5, 0],
  );
  if (scenario.consumes) {
    expect(
      [...state.usages]
        .sort((a, b) => a.partReference.localeCompare(b.partReference))
        .map(({ quantity, unitPrice, totalCost }) => [
          Number(quantity),
          Number(unitPrice),
          Number(totalCost),
        ]),
    ).toEqual([
      [2.5, 4, 10],
      [1.25, 4, 5],
    ]);
  }
  if (scenario === cases[0]) {
    expect(state.tasks[0].lastMaintenanceDate).toBe(performedAt);
    expect(state.tasks[0].nextMaintenanceDate).toBe('2026-02-01');
  }
}

// Bounded barriers, not timing-based sleeps: failures cannot leave a transaction waiting forever.
function barrier() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function bounded(promise) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Barrière MySQL non atteinte')), 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

beforeAll(async () => {
  const marker = process.env.GREENDESK_INTEGRATION_TOKEN;
  if (
    !/^[a-f0-9]{24}$/.test(marker ?? '') ||
    env.database.name !== `greendesk_adversarial_${marker}`
  ) {
    throw new Error(
      'Utilisez npm run test:integration : une base temporaire isolée est obligatoire.',
    );
  }
  logger.silent = true;
  initializeModels();
  await sequelize.authenticate();
  // Schema was cloned by the runner. Never sync/alter/force the source database.
});

afterEach(() => {
  IdempotencyKey.removeHook('afterCreate', 'hold-reservation');
  sequelize.removeHook('beforeQuery', 'observe-contention');
  AuditLog.removeHook('afterCreate', 'fail-after-writes');
  AuditLog.removeHook('afterCreate', 'hold-stock');
  IdempotencyKey.removeHook('afterCreate', 'observe-second-key');
});

describe.each(cases.filter(({ consumes }) => consumes))(
  '$name — concurrence de consommations distinctes',
  (scenario) => {
    test('deux clés différentes ne permettent pas de consommer deux fois le dernier stock', async () => {
      const data = await fixture();
      await data.parts[0].update({ quantityOnHand: 3 });
      const stockWritten = barrier();
      const secondReserved = barrier();
      const release = barrier();
      let firstTransaction;
      let secondTransaction;
      AuditLog.addHook('afterCreate', 'hold-stock', async (_record, options) => {
        firstTransaction = options.transaction.id;
        stockWritten.resolve();
        await bounded(release.promise);
      });
      IdempotencyKey.addHook('afterCreate', 'observe-second-key', (_record, options) => {
        if (firstTransaction) {
          secondTransaction = options.transaction.id;
          secondReserved.resolve();
        }
      });
      const first = send(scenario, data, randomUUID()).then((response) => response);
      let second;
      try {
        await bounded(stockWritten.promise);
        second = send(scenario, data, randomUUID()).then((response) => response);
        await bounded(secondReserved.promise);
        expect(secondTransaction).not.toBe(firstTransaction);
      } finally {
        release.resolve();
        await Promise.allSettled([first, second]);
      }
      const responses = await Promise.all([first, second]);
      expect(responses.map(({ status }) => status)).toEqual([scenario.status, 409]);
      const committed = await snapshot(data);
      expect(committed.parts.map((part) => Number(part.quantityOnHand))).toEqual([0.5, 8.75]);
      expect(committed.movements).toHaveLength(2);
      expect(committed.usages).toHaveLength(2);
      expect(committed.audits).toHaveLength(1);
      expect(committed.keys).toHaveLength(1);
      expect(committed.history).toHaveLength(scenario === cases[0] ? 1 : 0);
      expect(committed.interventions).toHaveLength(scenario === cases[1] ? 1 : 0);
    });
  },
);

test('une intervention locale ne peut pas consommer les pièces d’une autre société', async () => {
  const a = await fixture();
  const b = await fixture(a.user);
  const beforeA = await snapshot(a);
  const beforeB = await snapshot(b);
  const scenario = cases[1];
  const body = { ...scenario.body(a), materialUuid: b.material.uuid };
  await send(scenario, b, randomUUID(), { body }).expect(400);
  expect(await snapshot(a)).toEqual(beforeA);
  expect(await snapshot(b)).toEqual(beforeB);
});

afterAll(async () => {
  await sequelize.close();
  logger.silent = false;
});

describe.each(cases)('$name — MySQL réel', (scenario) => {
  test('double-clic : une seule écriture et une réponse identique', async () => {
    const data = await fixture();
    const key = randomUUID();
    const first = await send(scenario, data, key).expect(scenario.status);
    const committed = await snapshot(data);
    const replay = await send(scenario, data, key).expect(scenario.status);
    expect(replay.body).toEqual(first.body);
    expectOneWrite(committed, scenario, first);
    expect(await snapshot(data)).toEqual(committed);
  });

  test('perte de réponse après commit : le rejeu restitue la réponse persistée', async () => {
    const data = await fixture();
    const key = randomUUID();
    const disconnectedApp = express();
    let dropped = false;
    disconnectedApp.use((_req, res, next) => {
      const original = res.json;
      res.json = function (body) {
        if (res.statusCode === scenario.status && body.success) {
          dropped = true;
          res.destroy();
          return res;
        }
        return original.call(this, body);
      };
      next();
    });
    disconnectedApp.use(app);
    await expect(
      send(scenario, data, key, { target: disconnectedApp }).then((response) => response),
    ).rejects.toThrow();
    expect(dropped).toBe(true);
    const committed = await snapshot(data);
    const replay = await send(scenario, data, key).expect(scenario.status);
    expectOneWrite(committed, scenario, replay);
    expect(await snapshot(data)).toEqual(committed);
  });

  test('deux transactions concurrentes avec la même clé ne doublent pas les effets', async () => {
    const data = await fixture();
    const key = randomUUID();
    const reserved = barrier();
    const release = barrier();
    const contender = barrier();
    let firstConnection;
    let secondConnection;
    IdempotencyKey.addHook('afterCreate', 'hold-reservation', async (_record, options) => {
      firstConnection = options.transaction.connection.threadId;
      reserved.resolve();
      await bounded(release.promise);
    });
    sequelize.addHook('beforeQuery', 'observe-contention', (options, query) => {
      if (
        options.type === 'INSERT' &&
        options.instance instanceof IdempotencyKey &&
        firstConnection
      ) {
        secondConnection = query.connection.threadId;
        contender.resolve();
      }
    });
    const first = send(scenario, data, key).then((response) => response);
    let second;
    try {
      await bounded(reserved.promise);
      second = send(scenario, data, key).then((response) => response);
      await bounded(contender.promise);
      expect(secondConnection).not.toBe(firstConnection);
    } finally {
      release.resolve();
      await Promise.allSettled([first, second]);
    }
    const responses = await Promise.all([first, second]);
    expect(responses.map(({ status }) => status)).toEqual([scenario.status, scenario.status]);
    expect(responses[1].body).toEqual(responses[0].body);
    expectOneWrite(await snapshot(data), scenario, responses[0]);
  });

  test('même clé avec des données différentes : conflit sans modification', async () => {
    const data = await fixture();
    const key = randomUUID();
    await send(scenario, data, key).expect(scenario.status);
    const committed = await snapshot(data);
    await send(scenario, data, key, { body: scenario.changed(scenario.body(data)) }).expect(409);
    expect(await snapshot(data)).toEqual(committed);
  });

  test('erreur après les écritures : rollback intégral puis réutilisation de la clé', async () => {
    const data = await fixture();
    const key = randomUUID();
    const before = await snapshot(data);
    let uncommitted;
    AuditLog.addHook('afterCreate', 'fail-after-writes', async (_record, options) => {
      uncommitted = await snapshot(data, options.transaction);
      throw new Error('Panne injectée après les écritures métier et audit');
    });
    await send(scenario, data, key).expect(500);
    // Prove that real writes preceded the injected failure, rather than failing validation early.
    expect(uncommitted.movements).toHaveLength(scenario.consumes ? 2 : 1);
    expect(uncommitted.audits).toHaveLength(1);
    expect(uncommitted.keys).toHaveLength(1);
    expect(uncommitted.usages).toHaveLength(scenario.consumes ? 2 : 0);
    expect(uncommitted.history).toHaveLength(scenario === cases[0] ? 1 : 0);
    expect(uncommitted.interventions).toHaveLength(scenario === cases[1] ? 1 : 0);
    expect(await snapshot(data)).toEqual(before);
    AuditLog.removeHook('afterCreate', 'fail-after-writes');
    const retried = await send(scenario, data, key).expect(scenario.status);
    expectOneWrite(await snapshot(data), scenario, retried);
  });

  test('isolation des sociétés : même utilisateur et clé, réponses et écritures indépendantes', async () => {
    const a = await fixture();
    const b = await fixture(a.user);
    const key = randomUUID();
    const token = tokenFor(a, [scenario.permission], [a.company, b.company]);
    const first = await send(scenario, a, key, { token }).expect(scenario.status);
    const stateA = await snapshot(a);
    const second = await send(scenario, b, key, { token }).expect(scenario.status);
    const stateB = await snapshot(b);
    expect(second.body).not.toEqual(first.body);
    expectOneWrite(stateA, scenario, first);
    expectOneWrite(stateB, scenario, second);
    expect((await send(scenario, a, key, { token }).expect(scenario.status)).body).toEqual(
      first.body,
    );
    expect((await send(scenario, b, key, { token }).expect(scenario.status)).body).toEqual(
      second.body,
    );
    expect(await snapshot(a)).toEqual(stateA);
    expect(await snapshot(b)).toEqual(stateB);
  });

  test('une société étrangère ou ses identifiants ne donnent accès ni aux données ni au rejeu', async () => {
    const a = await fixture();
    const b = await fixture(a.user);
    const key = randomUUID();
    await send(scenario, a, key).expect(scenario.status);
    const stateA = await snapshot(a);
    const stateB = await snapshot(b);
    const restrictedToken = tokenFor(a, [scenario.permission]);
    await send(scenario, b, key, { token: restrictedToken }).expect(403);
    // A user allowed in both companies still cannot address an A resource while scoped to B.
    const token = tokenFor(a, [scenario.permission], [a.company, b.company]);
    const denied = await send(scenario, a, key, { token, company: b.company }).expect(404);
    expect(denied.body.success).toBe(false);
    expect(denied.body.data).toBeUndefined();
    expect(await snapshot(a)).toEqual(stateA);
    expect(await snapshot(b)).toEqual(stateB);
  });
});
