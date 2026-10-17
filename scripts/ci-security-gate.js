import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const requiredJobs = ['validation', 'mysql'];

/** A missing, skipped or cancelled prerequisite must never produce a green security gate. */
export function securityGateResult(results = {}) {
  const failedJobs = requiredJobs.filter((job) => results[job] !== 'success');
  return { passed: failedJobs.length === 0, failedJobs };
}

function run() {
  const results = {
    validation: process.env.CI_VALIDATION_RESULT ?? 'missing',
    mysql: process.env.CI_MYSQL_RESULT ?? 'missing',
  };
  const outcome = securityGateResult(results);
  const commit = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/i.test(commit ?? '')) {
    throw new Error('Un SHA GitHub valide est obligatoire pour attribuer les preuves CI.');
  }
  const directory = resolve('coverage/security');
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    resolve(directory, 'gate.json'),
    JSON.stringify(
      {
        commit,
        runId: process.env.GITHUB_RUN_ID,
        runAttempt: process.env.GITHUB_RUN_ATTEMPT,
        jobs: results,
        ...outcome,
      },
      null,
      2,
    ) + '\n',
  );
  if (!outcome.passed) {
    process.stderr.write(`Sécurité refusée : ${outcome.failedJobs.join(', ')}.\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) run();
