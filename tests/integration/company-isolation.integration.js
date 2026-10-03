import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { auditCompanyAssociations } from '../../scripts/audit-company-associations.js';

import app from '../../src/app.js';
import env from '../../src/config/env.js';
import sequelize from '../../src/config/database.js';
import { initializeModels } from '../../src/core/database/models.js';
import { runWithCompanyScope } from '../../src/core/company/company-context.js';
import logger from '../../src/core/logger/logger.js';
import Company from '../../src/modules/companies/model/company.model.js';
import Category from '../../src/modules/categories/model/category.model.js';
import PartManufacturer from '../../src/modules/manufacturers/model/part-manufacturer.model.js';
import Supplier from '../../src/modules/suppliers/model/supplier.model.js';
import User from '../../src/modules/users/model/user.model.js';
import Material from '../../src/modules/materials/model/material.model.js';
import MaterialFile from '../../src/modules/materials/model/material-file.model.js';
import MaintenancePart from '../../src/modules/maintenance/model/maintenance-part.model.js';
import MaintenanceOperation from '../../src/modules/maintenance/model/maintenance-operation.model.js';
import MaintenanceTask from '../../src/modules/maintenance/model/maintenance-task.model.js';
import MaintenanceTaskPart from '../../src/modules/maintenance/model/maintenance-task-part.model.js';
import MaintenanceHistory from '../../src/modules/maintenance/model/maintenance-history.model.js';
import MaintenancePartUsage from '../../src/modules/maintenance/model/maintenance-part-usage.model.js';
import MaintenanceCatalogRepository from '../../src/modules/maintenance/repository/maintenance-catalog.repository.js';
import AuditLog from '../../src/modules/audit/model/audit-log.model.js';

const permissions = [
  'categories.read',
  'categories.create',
  'categories.update',
  'categories.delete',
  'manufacturers.read',
  'manufacturers.create',
  'manufacturers.update',
  'manufacturers.delete',
  'suppliers.read',
  'suppliers.create',
  'suppliers.update',
  'suppliers.delete',
  'materials.read',
  'materials.update',
  'materials.delete',
  'materials.create',
  'materials.photos.create',
  'materials.photos.set_primary',
  'materials.documents.create',
  'materials.files.delete',
  'companies.update',
  'maintenance.update',
  'maintenance.read',
  'maintenance.create',
  'maintenance.parts.read',
  'maintenance.parts.create',
  'maintenance.parts.update',
  'maintenance.parts.delete',
  'maintenance.operations.read',
  'maintenance.operations.create',
  'maintenance.operations.update',
  'maintenance.operations.delete',
  'maintenance.sheets.read',
  'maintenance.parts.stock.order',
  'relations.read',
  'dashboard.read',
  'history.fleet.read',
  'history.maintenance.read',
];

let a;
let b;
let user;
let token;
const uploadedPaths = new Set();
const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'materials');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/kN8AAAAASUVORK5CYII=',
  'base64',
);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const referenceFamilies = [
  {
    label: 'catégories',
    path: '/api/v1/categories',
    model: Category,
    fields: (name) => ({ name }),
  },
  {
    label: 'fabricants',
    path: '/api/v1/manufacturers',
    model: PartManufacturer,
    fields: (name) => ({ name }),
  },
  {
    label: 'fournisseurs',
    path: '/api/v1/suppliers',
    model: Supplier,
    fields: (name) => ({ name }),
  },
  {
    label: 'opérations',
    path: '/api/v1/maintenance/operations',
    model: MaintenanceOperation,
    fields: (name) => ({ name, maintenanceType: 'preventive' }),
  },
  {
    label: 'pièces',
    path: '/api/v1/maintenance/parts',
    model: MaintenancePart,
    fields: (name) => ({ name, reference: `REF-${name}`, unit: 'pièce' }),
  },
];

function trackUploadedFile(response) {
  expect(response.status).toBe(201);
  const fileName = response.body.data.fileName;
  expect(fileName).toMatch(/^[0-9a-f-]{36}\.(?:png|pdf)$/);
  uploadedPaths.add(path.join(uploadDirectory, fileName));
  return response.body.data;
}

function api(company, allowed = token) {
  return {
    get: (path) =>
      request(app)
        .get(path)
        .set('Authorization', `Bearer ${allowed}`)
        .set('X-Company-Uuid', company.uuid),
    put: (path) =>
      request(app)
        .put(path)
        .set('Authorization', `Bearer ${allowed}`)
        .set('X-Company-Uuid', company.uuid),
    patch: (path) =>
      request(app)
        .patch(path)
        .set('Authorization', `Bearer ${allowed}`)
        .set('X-Company-Uuid', company.uuid),
    post: (path) =>
      request(app)
        .post(path)
        .set('Authorization', `Bearer ${allowed}`)
        .set('X-Company-Uuid', company.uuid),
    delete: (path) =>
      request(app)
        .delete(path)
        .set('Authorization', `Bearer ${allowed}`)
        .set('X-Company-Uuid', company.uuid),
  };
}

function accessToken(companies) {
  return jwt.sign(
    {
      sub: user.uuid,
      userId: Number(user.id),
      authorizationVersion: 0,
      jti: randomUUID(),
      permissions,
      companyAccess: companies.map(({ company }) => ({
        id: Number(company.id),
        uuid: company.uuid,
      })),
    },
    env.jwt.secret,
    { expiresIn: '5m' },
  );
}

async function fixture(label) {
  const company = await Company.create({ name: `R2 ${label} ${randomUUID()}` });
  await user.addCompany(company);
  const marker = `${label}-${randomUUID()}`;
  const material = await Material.create({
    companyId: company.id,
    name: `Matériel ${marker}`,
    unit: 'pièce',
  });
  const part = await MaintenancePart.create({
    companyId: company.id,
    name: `Pièce ${marker}`,
    reference: `REF-${marker}`,
    quantityOnHand: 10,
    unitPrice: 4,
  });
  const task = await MaintenanceTask.create({
    companyId: company.id,
    materialId: material.id,
    title: `Plan ${marker}`,
    maintenanceType: 'preventive',
    intervalDays: 30,
    lastMaintenanceDate: '2026-01-01',
    nextMaintenanceDate: '2026-01-31',
  });
  await MaintenanceTaskPart.create({
    companyId: company.id,
    maintenanceTaskId: task.id,
    maintenancePartId: part.id,
    quantity: 1,
  });
  const file = await MaterialFile.create({
    companyId: company.id,
    materialId: material.id,
    kind: 'photo',
    name: `Photo ${marker}`,
    originalName: 'photo.png',
    fileName: `${randomUUID()}.png`,
    mimeType: 'image/png',
    size: 1,
  });
  return { company, marker, material, part, task, file };
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
  user = await User.create({
    firstName: 'R2',
    lastName: 'Isolation',
    email: `${randomUUID()}@example.invalid`,
    passwordHash: 'unused-integration-test-password',
    emailVerifiedAt: new Date(),
  });
  a = await fixture('A');
  b = await fixture('B');
  token = accessToken([a, b]);
});

afterAll(async () => {
  for (const filePath of uploadedPaths) await fs.rm(filePath, { force: true });
  await sequelize.close();
});

test('uploads, lecture et suppression de fichiers restent dans la société sélectionnée', async () => {
  const clientA = api(a.company);
  const clientB = api(b.company);
  const bFilesBefore = await MaterialFile.count({ where: { companyId: b.company.id } });
  const foreignUpload = await clientA
    .post(`/api/v1/materials/${b.material.uuid}/photos`)
    .attach('file', png, { filename: 'test.png', contentType: 'image/png' });
  expect(foreignUpload.status).toBe(404);
  expect(await MaterialFile.count({ where: { companyId: b.company.id } })).toBe(bFilesBefore);

  const aPhoto = trackUploadedFile(
    await clientA
      .post(`/api/v1/materials/${a.material.uuid}/photos`)
      .attach('file', png, { filename: 'a.png', contentType: 'image/png' }),
  );
  const bPhoto = trackUploadedFile(
    await clientB
      .post(`/api/v1/materials/${b.material.uuid}/photos`)
      .attach('file', png, { filename: 'b.png', contentType: 'image/png' }),
  );
  const aDocument = trackUploadedFile(
    await clientA
      .post(`/api/v1/materials/${a.material.uuid}/documents`)
      .field('documentType', 'manual')
      .attach('file', pdf, { filename: 'manual.pdf', contentType: 'application/pdf' }),
  );

  for (const file of [bPhoto]) {
    expect((await clientA.get(`/api/v1/materials/files/${file.uuid}/content`)).status).toBe(404);
    expect((await clientA.get(`/api/v1/materials/files/${file.uuid}/download`)).status).toBe(404);
    expect((await clientA.patch(`/api/v1/materials/files/${file.uuid}/primary`)).status).toBe(404);
    expect((await clientA.delete(`/api/v1/materials/files/${file.uuid}`)).status).toBe(404);
    expect(await MaterialFile.count({ where: { uuid: file.uuid, companyId: b.company.id } })).toBe(
      1,
    );
    expect(await fs.readFile(path.join(uploadDirectory, file.fileName))).toEqual(png);
  }
  expect((await clientB.get(`/api/v1/materials/files/${bPhoto.uuid}/content`)).status).toBe(200);
  expect((await clientA.get(`/api/v1/materials/files/${aPhoto.uuid}/content`)).status).toBe(200);
  expect((await clientA.get(`/api/v1/materials/files/${aDocument.uuid}/download`)).status).toBe(
    200,
  );
  expect((await clientA.patch(`/api/v1/materials/files/${aPhoto.uuid}/primary`)).status).toBe(200);

  expect((await clientB.delete(`/api/v1/materials/files/${bPhoto.uuid}`)).status).toBe(204);
  await expect(fs.access(path.join(uploadDirectory, bPhoto.fileName))).rejects.toMatchObject({
    code: 'ENOENT',
  });
  expect((await clientA.delete(`/api/v1/materials/files/${aPhoto.uuid}`)).status).toBe(204);
  expect((await clientA.delete(`/api/v1/materials/files/${aDocument.uuid}`)).status).toBe(204);
});

test('un événement d’impression est attribué à la société sélectionnée, jamais à celle du body', async () => {
  const where = { action: 'PRINT_MAINTENANCE_SHEETS', entity: 'MAINTENANCE_SHEET_PRINT' };
  const countA = await AuditLog.count({ where: { ...where, companyId: a.company.id } });
  const countB = await AuditLog.count({ where: { ...where, companyId: b.company.id } });

  const printedA = await api(a.company)
    .post('/api/v1/maintenance/sheets/print-events')
    .send({ companyId: b.company.id });
  expect(printedA.status).toBe(201);
  expect(await AuditLog.count({ where: { ...where, companyId: a.company.id } })).toBe(countA + 1);
  expect(await AuditLog.count({ where: { ...where, companyId: b.company.id } })).toBe(countB);

  const forbiddenB = await api(b.company, accessToken([a])).post(
    '/api/v1/maintenance/sheets/print-events',
  );
  expect(forbiddenB.status).toBe(403);
  expect(await AuditLog.count({ where: { ...where, companyId: b.company.id } })).toBe(countB);

  const printedB = await api(b.company).post('/api/v1/maintenance/sheets/print-events');
  expect(printedB.status).toBe(201);
  expect(await AuditLog.count({ where: { ...where, companyId: b.company.id } })).toBe(countB + 1);
});

test('lecture, recherche, compteurs, relations et impression restent dans la société sélectionnée', async () => {
  const client = api(a.company);
  const paths = [
    `/api/v1/materials?search=${encodeURIComponent(b.marker)}`,
    `/api/v1/materials/options?search=${encodeURIComponent(b.marker)}`,
    `/api/v1/categories?search=${encodeURIComponent(b.marker)}`,
    `/api/v1/manufacturers?search=${encodeURIComponent(b.marker)}`,
    `/api/v1/suppliers?search=${encodeURIComponent(b.marker)}`,
    `/api/v1/maintenance?search=${encodeURIComponent(b.marker)}`,
    `/api/v1/maintenance/operations?search=${encodeURIComponent(b.marker)}`,
    `/api/v1/maintenance/parts?search=${encodeURIComponent(b.marker)}`,
    '/api/v1/maintenance/parts/suggestions',
    '/api/v1/maintenance/order-list',
    '/api/v1/maintenance/interventions',
    '/api/v1/dashboard/summary',
    '/api/v1/relations?mode=complete',
    '/api/v1/maintenance/sheets',
    '/api/v1/history/fleet?limit=25',
  ];
  for (const path of paths) {
    const response = await client.get(path);
    expect({ path, status: response.status, body: response.body }).toMatchObject({
      path,
      status: 200,
    });
    expect(JSON.stringify(response.body)).not.toContain(b.marker);
    expect(JSON.stringify(response.body)).not.toContain(b.material.uuid);
    expect(JSON.stringify(response.body)).not.toContain(b.part.uuid);
    if (path.includes('search=')) expect(response.body.data.pagination.total).toBe(0);
  }
  for (const path of [
    `/api/v1/materials/${b.material.uuid}`,
    `/api/v1/maintenance/${b.task.uuid}`,
    `/api/v1/maintenance/parts/${b.part.uuid}/stock-movements`,
    `/api/v1/materials/files/${b.file.uuid}/content`,
    `/api/v1/materials/files/${b.file.uuid}/download`,
  ]) {
    const response = await client.get(path);
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(b.marker);
  }
});

describe.each(referenceFamilies)('$label — isolation et restauration A/B', (family) => {
  test('une recherche et une mutation sous A ne touchent pas une entrée de B', async () => {
    const name = `Étranger ${randomUUID()}`;
    const foreign = await family.model.create({ companyId: b.company.id, ...family.fields(name) });
    const client = api(a.company);
    const foundInA = await client.get(`${family.path}?search=${encodeURIComponent(name)}`);
    expect(foundInA.status).toBe(200);
    expect(foundInA.body.data.pagination.total).toBe(0);
    const foundInB = await api(b.company).get(`${family.path}?search=${encodeURIComponent(name)}`);
    expect(foundInB.status).toBe(200);
    expect(JSON.stringify(foundInB.body)).toContain(foreign.uuid);

    const originalName = foreign.name;
    const auditCount = await AuditLog.count({ where: { companyId: b.company.id } });
    expect(
      (await client.put(`${family.path}/${foreign.uuid}`).send({ name: 'Nom détourné' })).status,
    ).toBe(404);
    expect((await client.delete(`${family.path}/${foreign.uuid}`)).status).toBe(404);
    await foreign.reload();
    expect(foreign.name).toBe(originalName);
    expect(foreign.deletedAt).toBeNull();
    expect(await AuditLog.count({ where: { companyId: b.company.id } })).toBe(auditCount);
  });

  test('une création restaure uniquement la ligne supprimée de la société choisie', async () => {
    const name = `Restauration ${randomUUID()}`;
    const values = family.fields(name);
    const deletedA = await family.model.create({ companyId: a.company.id, ...values });
    const deletedB = await family.model.create({ companyId: b.company.id, ...values });
    await deletedA.destroy();
    await deletedB.destroy();

    const forbiddenRestore = await api(a.company)
      .post(family.path)
      .send({ ...values, companyId: b.company.id });
    expect(forbiddenRestore.status).toBe(400);
    expect((await deletedA.reload({ paranoid: false })).deletedAt).not.toBeNull();
    expect((await deletedB.reload({ paranoid: false })).deletedAt).not.toBeNull();
    const restoredA = await api(a.company).post(family.path).send(values);
    expect(restoredA.status).toBe(201);
    expect(restoredA.body.data.uuid).toBe(deletedA.uuid);
    await deletedA.reload({ paranoid: false });
    await deletedB.reload({ paranoid: false });
    expect(deletedA.deletedAt).toBeNull();
    expect(deletedB.deletedAt).not.toBeNull();
    expect(
      await AuditLog.count({
        where: { companyId: a.company.id, action: 'RESTORE', entityUuid: deletedA.uuid },
      }),
    ).toBe(1);

    const restoredB = await api(b.company).post(family.path).send(values);
    expect(restoredB.status).toBe(201);
    expect(restoredB.body.data.uuid).toBe(deletedB.uuid);
    await deletedB.reload({ paranoid: false });
    expect(deletedB.deletedAt).toBeNull();
  });
});

test('les compteurs du tableau de bord correspondent aux lignes de A', async () => {
  const response = await api(a.company).get('/api/v1/dashboard/summary');
  expect(response.status).toBe(200);
  const summary = response.body.data;
  expect(summary.materials.total).toBe(
    await Material.count({ where: { companyId: a.company.id } }),
  );
  expect(summary.categories.total).toBe(
    await Category.count({ where: { companyId: a.company.id } }),
  );
  expect(summary.manufacturers.total).toBe(
    await PartManufacturer.count({ where: { companyId: a.company.id } }),
  );
  expect(await Material.count({ where: { companyId: b.company.id } })).toBeGreaterThan(0);
  expect(await Category.count({ where: { companyId: b.company.id } })).toBeGreaterThan(0);
});

test('les références vers les répertoires B sont refusées avant une création sous A', async () => {
  const marker = randomUUID();
  const category = await Category.create({ companyId: b.company.id, name: `Catégorie ${marker}` });
  const manufacturer = await PartManufacturer.create({
    companyId: b.company.id,
    name: `Fabricant ${marker}`,
  });
  const supplier = await Supplier.create({
    companyId: b.company.id,
    name: `Fournisseur ${marker}`,
  });
  const operation = await MaintenanceOperation.create({
    companyId: b.company.id,
    name: `Opération ${marker}`,
    maintenanceType: 'preventive',
  });
  const materialCount = await Material.count({ where: { companyId: a.company.id } });
  const partCount = await MaintenancePart.count({ where: { companyId: a.company.id } });
  const taskCount = await MaintenanceTask.count({ where: { companyId: a.company.id } });
  const auditCount = await AuditLog.count({ where: { companyId: a.company.id } });
  const client = api(a.company);

  for (const relation of [
    { categoryUuid: category.uuid },
    { manufacturerUuid: manufacturer.uuid },
  ]) {
    const response = await client.post('/api/v1/materials').send({
      name: `Matériel étranger ${randomUUID()}`,
      unit: 'pièce',
      purchasePrice: 0,
      ...relation,
    });
    expect([400, 404]).toContain(response.status);
  }
  for (const relation of [
    { manufacturerUuid: manufacturer.uuid },
    { supplierUuid: supplier.uuid },
  ]) {
    const response = await client.post('/api/v1/maintenance/parts').send({
      name: `Pièce étrangère ${randomUUID()}`,
      reference: `REF-${randomUUID()}`,
      ...relation,
    });
    expect([400, 404]).toContain(response.status);
  }
  const plan = await client.post('/api/v1/maintenance').send({
    materialUuid: a.material.uuid,
    operationUuid: operation.uuid,
    intervalDays: 30,
    lastMaintenanceDate: '2026-01-01',
  });
  expect([400, 404]).toContain(plan.status);
  expect(await Material.count({ where: { companyId: a.company.id } })).toBe(materialCount);
  expect(await MaintenancePart.count({ where: { companyId: a.company.id } })).toBe(partCount);
  expect(await MaintenanceTask.count({ where: { companyId: a.company.id } })).toBe(taskCount);
  expect(await AuditLog.count({ where: { companyId: a.company.id } })).toBe(auditCount);
});

test('écritures et suppression B depuis A refusées sans effet, même avec accès aux deux sociétés', async () => {
  const originalName = b.material.name;
  const auditCount = await AuditLog.count({ where: { companyId: b.company.id } });
  const client = api(a.company);
  const changed = await client
    .put(`/api/v1/materials/${b.material.uuid}`)
    .send({ name: 'Détournement R2' });
  expect(changed.status).toBe(404);
  const removed = await client.delete(`/api/v1/materials/${b.material.uuid}`);
  expect(removed.status).toBe(404);
  const stock = await client
    .patch(`/api/v1/maintenance/parts/${b.part.uuid}/stock`)
    .set('Idempotency-Key', randomUUID())
    .send({ performedAt: '2026-01-02', operation: 'order', quantity: 1 });
  expect(stock.status).toBe(404);
  await b.material.reload();
  await b.part.reload();
  expect(b.material.name).toBe(originalName);
  expect(Number(b.part.quantityOnOrder)).toBe(0);
  expect(await AuditLog.count({ where: { companyId: b.company.id } })).toBe(auditCount);
});

test('un compte autorisé seulement dans A ne peut sélectionner B', async () => {
  const response = await api(b.company, accessToken([a])).get('/api/v1/materials');
  expect(response.status).toBe(403);
});

test('société du body refusée et lot A/B refusé sans insertion partielle', async () => {
  const client = api(a.company);
  const name = `Corps R2 ${randomUUID()}`;
  const created = await client.post('/api/v1/materials').send({
    companyId: b.company.id,
    name,
    unit: 'pièce',
    purchasePrice: 0,
  });
  expect(created.status).toBe(400);
  expect(await Material.count({ where: { name } })).toBe(0);
  const legitimate = await client
    .post('/api/v1/materials')
    .send({ name, unit: 'pièce', purchasePrice: 0 });
  expect(legitimate.status).toBe(201);
  expect(legitimate.body.data.companyId).toBe(Number(a.company.id));
  expect(await Material.count({ where: { companyId: b.company.id, name } })).toBe(0);

  const title = `Lot mixte ${randomUUID()}`;
  const taskCount = await MaintenanceTask.count({ where: { companyId: a.company.id } });
  const batch = await client.post('/api/v1/maintenance').send({
    materialUuid: a.material.uuid,
    title,
    maintenanceType: 'preventive',
    intervalDays: 30,
    lastMaintenanceDate: '2026-01-01',
    parts: [
      { partUuid: a.part.uuid, quantity: 1 },
      { partUuid: b.part.uuid, quantity: 1 },
    ],
  });
  expect(batch.status).toBe(400);
  expect(await MaintenanceTask.count({ where: { companyId: a.company.id } })).toBe(taskCount);
});

test('la restauration par nom ne récupère pas le matériel supprimé de B', async () => {
  const deleted = await Material.create({
    companyId: b.company.id,
    name: `Restauration ${randomUUID()}`,
    unit: 'pièce',
  });
  await deleted.destroy();
  const response = await api(a.company).post('/api/v1/materials').send({
    name: deleted.name,
    unit: 'pièce',
    purchasePrice: 0,
  });
  expect(response.status).toBe(201);
  expect(response.body.data.uuid).not.toBe(deleted.uuid);
  await deleted.reload({ paranoid: false });
  expect(deleted.deletedAt).not.toBeNull();
});

test('des appels A/B concurrents conservent chacun leur contexte', async () => {
  const calls = Array.from({ length: 8 }, (_, index) => {
    const selected = index % 2 ? b : a;
    const other = index % 2 ? a : b;
    return api(selected.company)
      .get(`/api/v1/maintenance/parts?search=${encodeURIComponent(selected.marker)}`)
      .then((response) => {
        expect(response.status).toBe(200);
        expect(JSON.stringify(response.body)).toContain(selected.part.uuid);
        expect(JSON.stringify(response.body)).not.toContain(other.part.uuid);
      });
  });
  await Promise.all(calls);
});

test('une rupture de contexte refuse la lecture avant toute requête MySQL', () => {
  let queryCount = 0;
  sequelize.addHook('beforeQuery', 'r2-missing-context', () => {
    queryCount += 1;
  });
  try {
    expect(() =>
      runWithCompanyScope(null, () => new MaintenanceCatalogRepository().findParts()),
    ).toThrow('Un contexte de société est requis.');
    expect(queryCount).toBe(0);
  } finally {
    sequelize.removeHook('beforeQuery', 'r2-missing-context');
  }
});

test('les associations incohérentes ne révèlent aucun objet B via une racine A', async () => {
  // Les anciennes FK simples autorisent ce cas ; il simule une donnée déjà incohérente.
  await a.material.update({ categoryId: null });
  await MaintenanceTaskPart.destroy({ where: { maintenanceTaskId: a.task.id } });
  await MaintenanceTaskPart.create({
    companyId: a.company.id,
    maintenanceTaskId: a.task.id,
    maintenancePartId: b.part.id,
    quantity: 1,
  });
  await a.file.update({ materialId: b.material.id });
  const response = await api(a.company).get(`/api/v1/maintenance/${a.task.uuid}`);
  expect(response.status).toBe(200);
  expect(JSON.stringify(response.body)).not.toContain(b.part.uuid);
  const material = await api(b.company).get(`/api/v1/materials/${b.material.uuid}`);
  expect(material.status).toBe(200);
  expect(JSON.stringify(material.body)).not.toContain(a.file.uuid);
});

test('un journal A pointant vers un sujet B ne révèle pas son libellé', async () => {
  const event = await AuditLog.create({
    companyId: a.company.id,
    userId: user.id,
    action: 'UPDATE',
    entity: 'MATERIAL',
    entityUuid: b.material.uuid,
  });
  const response = await api(a.company).get('/api/v1/history/fleet?limit=25');
  expect(response.status).toBe(200);
  const item = response.body.data.items.find(({ uuid }) => uuid === event.uuid);
  expect(item.subject.label).not.toContain(b.marker);
  expect(item.subject.label).toBe('Matériel supprimé');
});

test('un historique A lié par erreur à un plan B masque le plan et son matériel', async () => {
  const history = await MaintenanceHistory.create({
    companyId: a.company.id,
    maintenanceTaskId: b.task.id,
    performedAt: '2026-01-03',
    performedBy: user.id,
  });
  const response = await api(a.company).get(
    '/api/v1/history/maintenance?type=planned_execution&limit=25',
  );
  expect(response.status).toBe(200);
  const item = response.body.data.items.find(({ uuid }) => uuid === history.uuid);
  expect(item.subject.label).toBe('Plan supprimé');
  expect(JSON.stringify(item)).not.toContain(b.marker);
});

test('le coût d’une pièce A ignore une consommation marquée B', async () => {
  const history = await MaintenanceHistory.create({
    companyId: b.company.id,
    maintenanceTaskId: b.task.id,
    performedAt: '2026-01-02',
    performedBy: user.id,
  });
  await MaintenancePartUsage.create({
    companyId: b.company.id,
    maintenanceHistoryId: history.id,
    maintenancePartId: a.part.id,
    partUuid: a.part.uuid,
    partName: a.part.name,
    partReference: a.part.reference,
    unit: 'pièce',
    quantity: 1,
    unitPrice: 99,
    totalCost: 99,
    performedAt: '2026-01-02',
  });
  const response = await api(a.company).get(`/api/v1/maintenance/parts?partUuid=${a.part.uuid}`);
  expect(response.status).toBe(200);
  expect(response.body.data.items[0].totalMaintenanceCost).toBe(0);
});

test('l’audit détecte les associations A/B incohérentes injectées', async () => {
  const report = await auditCompanyAssociations(sequelize);
  expect(report.missingForeignKeys).toEqual([]);
  for (const [child, column] of [
    ['maintenance_task_parts', 'maintenance_part_id'],
    ['material_files', 'material_id'],
    ['maintenance_history', 'maintenance_task_id'],
    ['maintenance_part_usages', 'maintenance_part_id'],
  ]) {
    expect(
      report.relations.find((relation) => relation.child === child && relation.column === column),
    ).toMatchObject({ mismatches: expect.any(Number) });
    expect(
      report.relations.find((relation) => relation.child === child && relation.column === column)
        .mismatches,
    ).toBeGreaterThan(0);
  }
  expect(
    report.auditSubjects.find((subject) => subject.entity === 'MATERIAL').mismatches,
  ).toBeGreaterThan(0);
  expect(report.mismatches).toBeGreaterThanOrEqual(5);
});

test('les contraintes MySQL déployées imposent les clés simples et la société non nulle', async () => {
  const [references] = await sequelize.query(`
    SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, REFERENCED_TABLE_NAME AS parentName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  for (const [tableName, columnName, parentName] of [
    ['maintenance_task_parts', 'maintenance_task_id', 'maintenance_tasks'],
    ['maintenance_task_parts', 'maintenance_part_id', 'maintenance_parts'],
    ['material_files', 'material_id', 'materials'],
    ['maintenance_part_usages', 'maintenance_part_id', 'maintenance_parts'],
  ]) {
    expect(references).toEqual(
      expect.arrayContaining([expect.objectContaining({ tableName, columnName, parentName })]),
    );
  }
  const [columns] = await sequelize.query(`
    SELECT TABLE_NAME AS tableName, IS_NULLABLE AS nullable
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'company_id'
      AND TABLE_NAME IN ('materials', 'material_files', 'maintenance_parts', 'maintenance_task_parts')
  `);
  expect(columns).toHaveLength(4);
  expect(columns.every(({ nullable }) => nullable === 'NO')).toBe(true);
});

test('R4 refuse les champs internes sur les écritures métier sans modifier les données ou l’audit', async () => {
  const client = api(a.company);
  const cases = [];
  for (const family of referenceFamilies) {
    const name = `R4-${randomUUID()}`;
    const entity = await family.model.create({ companyId: a.company.id, ...family.fields(name) });
    cases.push([family.path, family.model, entity, family.fields(name)]);
  }
  cases.push([
    '/api/v1/materials',
    Material,
    a.material,
    { name: a.material.name, unit: 'pièce', purchasePrice: 0 },
  ]);
  cases.push([
    '/api/v1/maintenance',
    MaintenanceTask,
    a.task,
    {
      materialUuid: a.material.uuid,
      title: a.task.title,
      maintenanceType: 'preventive',
      intervalDays: 30,
      lastMaintenanceDate: '2026-01-01',
    },
  ]);
  cases.push(['/api/v1/companies', Company, a.company, { name: a.company.name }]);
  for (const [url, model, entity, valid] of cases) {
    const before = (await model.findByPk(entity.id, { paranoid: false })).get({ plain: true });
    const auditBefore = await AuditLog.count();
    for (const field of [
      'id',
      'uuid',
      'deletedAt',
      'createdBy',
      'logoFileName',
      'manufacturerId',
    ]) {
      const values = {
        [field]:
          field === 'id' ? 999999 : field === 'deletedAt' ? '2026-10-03T00:00:00Z' : 'R4_FORBIDDEN',
      };
      expect((await client.put(`${url}/${entity.uuid}`).send(values)).status).toBe(400);
      if (model !== Company)
        expect((await client.post(url).send({ ...valid, ...values })).status).toBe(400);
    }
    expect((await model.findByPk(entity.id, { paranoid: false })).get({ plain: true })).toEqual(
      before,
    );
    expect(await AuditLog.count()).toBe(auditBefore);
  }
  const planBefore = (await a.task.reload()).get({ plain: true });
  expect(
    (await client.put(`/api/v1/maintenance/${a.task.uuid}`).send({ active: false })).status,
  ).toBe(400);
  expect((await a.task.reload()).get({ plain: true })).toEqual(planBefore);
});

test('R4 conserve un logo étranger après une tentative de substitution de sa référence', async () => {
  const foreignFileName = `${randomUUID()}.png`;
  const foreignPath = path.resolve('uploads', 'companies', foreignFileName);
  await fs.writeFile(foreignPath, png);
  uploadedPaths.add(foreignPath);
  await b.company.update({ logoFileName: foreignFileName, logoMimeType: 'image/png' });
  const before = (await a.company.reload()).get({ plain: true });
  const response = await api(a.company, accessToken([a]))
    .put(`/api/v1/companies/${a.company.uuid}`)
    .send({ logoFileName: foreignFileName, logoMimeType: 'image/png' });
  expect(response.status).toBe(400);
  expect((await a.company.reload()).get({ plain: true })).toEqual(before);
  expect(await fs.readFile(foreignPath)).toEqual(png);
  const shared = await User.findByPk(user.id, { include: [{ model: Company, as: 'companies' }] });
  const publicUser = shared.toJSON();
  expect(JSON.stringify(publicUser)).not.toContain(foreignFileName);
  expect(publicUser.companies.find(({ uuid }) => uuid === b.company.uuid).hasLogo).toBe(true);
});

test('R4 refuse les types, tailles et filtres hors contrat et conserve le SQL structuré', async () => {
  const client = api(a.company);
  for (const values of [
    { name: ['array'] },
    { name: { token: 'R4_FAKE_SECRET' } },
    { notes: 'x'.repeat(10001) },
    { purchasePrice: 1e30 },
  ]) {
    expect((await client.put(`/api/v1/materials/${a.material.uuid}`).send(values)).status).toBe(
      400,
    );
  }
  for (const query of [
    'page=10001',
    'page=9007199254740992',
    'limit=1000000',
    'sort=name%3BDROP%20TABLE%20users',
    'direction=ASC%3BDELETE',
  ]) {
    expect((await client.get(`/api/v1/materials?${query}`)).status).toBe(400);
  }
  const response = await client.get('/api/v1/materials').query({ search: "' OR 1=1 --" });
  expect(response.status).toBe(200);
  expect(response.body.data.items).toEqual([]);
});

test('R4 préserve la normalisation des champs texte facultatifs usuels', async () => {
  const client = api(a.company);
  const supplier = await client.post('/api/v1/suppliers').send({
    name: `R4 ${randomUUID()}`,
    contactName: '  Contact  ',
    phone: '  012345  ',
    notes: '  Note  ',
  });
  expect(supplier.status).toBe(201);
  expect(supplier.body.data).toMatchObject({
    contactName: 'Contact',
    phone: '012345',
    notes: 'Note',
  });
  const part = await client.post('/api/v1/maintenance/parts').send({
    name: `R4 ${randomUUID()}`,
    reference: randomUUID(),
    manufacturer: '  Ancien fabricant  ',
    supplierReference: '  ABC  ',
    unitPrice: 12.5,
  });
  expect(part.status).toBe(201);
  expect(part.body.data).toMatchObject({
    manufacturer: 'Ancien fabricant',
    supplierReference: 'ABC',
    unitPrice: 12.5,
  });
});
