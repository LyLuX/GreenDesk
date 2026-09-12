import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

import env from '../src/config/env.js';

// Never accept a database name from the caller: only this freshly created schema is disposable.
const token = randomBytes(12).toString('hex');
const database = `greendesk_adversarial_${token}`;
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
let connection;
let created = false;

async function runNode(args) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_DATABASE_NAME: database,
        DATABASE_NAME: database,
      },
    });
    child.once('error', reject);
    child.once('exit', (status) => resolve(status ?? 1));
  });
  if (code !== 0) throw new Error(`Échec du contrôle : ${args.join(' ')}`);
}

const migrate = () =>
  runNode(['node_modules/sequelize-cli/lib/sequelize', 'db:migrate', '--env', 'test']);

try {
  connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
  });
  await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  created = true;
  process.stdout.write(`Base MySQL de test isolée : ${database}\n`);
  await migrate();
  await runNode(['scripts/check-schema.js']);

  // Emulate an existing database with the complete old history but without this patch.
  // All DDL stays on the random database created above, never the configured application DB.
  await connection.query(`USE \`${database}\``);
  await connection.query(
    "INSERT INTO roles (uuid, name, description, created_at, updated_at) VALUES (UUID(), 'migration-survivor', 'Donnée à préserver', NOW(), NOW())",
  );
  const [before] = await connection.query('SELECT * FROM roles ORDER BY id');
  const [references] = await connection.execute(
    'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME = ?',
    [database, 'email_verification_tokens', 'user_id', 'users'],
  );
  for (const reference of references) {
    await connection.query('ALTER TABLE email_verification_tokens DROP FOREIGN KEY ??', [
      reference.CONSTRAINT_NAME,
    ]);
  }
  for (const table of [
    'revoked_access_tokens',
    'maintenance_interventions',
    'inventory_stock_movements',
  ]) {
    await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN deleted_at`);
  }
  await connection.execute('DELETE FROM SequelizeMeta WHERE name IN (?, ?)', [
    '20260723_initial_schema.js',
    '20260912_complete_migrated_schema.js',
  ]);
  await migrate();
  await runNode(['scripts/check-schema.js']);
  const [after] = await connection.query('SELECT * FROM roles ORDER BY id');
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error('La mise à niveau a modifié les données existantes.');
  await migrate(); // A repeated deployment must be a no-op.
  process.stdout.write(
    'Reconstruction, adoption et mise à niveau SQL validées ; données conservées.\n',
  );
  process.exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--experimental-vm-modules',
        'node_modules/jest/bin/jest.js',
        '--config',
        'jest.integration.config.js',
        '--runInBand',
      ],
      {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DATABASE_NAME: database,
          DATABASE_LOGGING: 'false',
          GREENDESK_INTEGRATION_TOKEN: token,
          JWT_SECRET: randomBytes(32).toString('hex'),
          RATE_LIMIT_ENABLED: 'false',
        },
      },
    );
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
} catch (error) {
  process.stderr.write(`Tests MySQL impossibles : ${error.message}\n`);
  process.exitCode = 1;
} finally {
  try {
    if (created) {
      if (!/^greendesk_adversarial_[a-f0-9]{24}$/.test(database)) {
        throw new Error('Nom de base de test non sûr : suppression refusée.');
      }
      await connection.query(`DROP DATABASE \`${database}\``);
      process.stdout.write(`Base de test supprimée : ${database}\n`);
    }
  } catch (error) {
    process.stderr.write(`Nettoyage impossible pour ${database} : ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await connection?.end();
  }
}
