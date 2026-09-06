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
  // Clone DDL only, including the installed migrations' indexes and foreign keys. No business data.
  const [tables] = await connection.query(
    `SHOW FULL TABLES FROM ${connection.escapeId(env.database.name)} WHERE Table_type = 'BASE TABLE'`,
  );
  if (!tables.length) throw new Error('La base source ne contient aucune table.');
  await connection.changeUser({ database });
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [definition] = await connection.query(
        `SHOW CREATE TABLE ${connection.escapeId(env.database.name)}.${connection.escapeId(tableName)}`,
      );
      const ddl = definition[0]['Create Table'];
      // Never allow a cloned foreign key to target an external schema.
      if (/REFERENCES\s+`[^`]+`\s*\./i.test(ddl)) {
        throw new Error(`Référence inter-base dans ${tableName} : copie refusée.`);
      }
      await connection.query(ddl);
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  }
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
