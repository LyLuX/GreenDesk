import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { securityGateResult } from '../scripts/ci-security-gate.js';

describe('release security gate', () => {
  it('accepts only successful application and MySQL validations', () => {
    expect(securityGateResult({ validation: 'success', mysql: 'success' })).toEqual({
      passed: true,
      failedJobs: [],
    });
  });

  it.each(['failure', 'cancelled', 'skipped', undefined, 'unknown'])(
    'blocks each prerequisite with result %s even when the other job passed',
    (result) => {
      for (const job of ['validation', 'mysql']) {
        expect(
          securityGateResult({ validation: 'success', mysql: 'success', [job]: result }),
        ).toEqual({ passed: false, failedJobs: [job] });
      }
    },
  );

  it('blocks a missing result collection instead of treating it as a successful empty batch', () => {
    expect(securityGateResult()).toEqual({
      passed: false,
      failedJobs: ['validation', 'mysql'],
    });
  });
});

describe('security gate command and evidence', () => {
  const command = fileURLToPath(new URL('../scripts/ci-security-gate.js', import.meta.url));

  it.each([
    ['success', 'success', 0],
    ['success', 'skipped', 1],
    ['cancelled', 'success', 1],
  ])('persists the decision for validation=%s mysql=%s', (validation, mysql, expectedCode) => {
    const prefix = join(tmpdir(), 'greendesk-security-gate-');
    const directory = mkdtempSync(prefix);
    try {
      const commit = 'a'.repeat(40);
      const child = spawnSync(process.execPath, [command], {
        cwd: directory,
        env: {
          ...process.env,
          GITHUB_SHA: commit,
          GITHUB_RUN_ID: '123',
          GITHUB_RUN_ATTEMPT: '2',
          CI_VALIDATION_RESULT: validation,
          CI_MYSQL_RESULT: mysql,
        },
        encoding: 'utf8',
        timeout: 10000,
      });
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(expectedCode);
      const report = JSON.parse(
        readFileSync(join(directory, 'coverage/security/gate.json'), 'utf8'),
      );
      expect(report).toMatchObject({
        commit,
        runId: '123',
        runAttempt: '2',
        jobs: { validation, mysql },
        passed: expectedCode === 0,
      });
      if (expectedCode !== 0) expect(child.stderr).toContain('Sécurité refusée');
    } finally {
      if (!directory.startsWith(prefix)) throw new Error('Répertoire temporaire inattendu');
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
