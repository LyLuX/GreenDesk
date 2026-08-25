import { jest } from '@jest/globals';

import enforceCompanyNotNull from '../migrations/20260825_zzzzz_enforce_company_not_null.js';
import backfillDeletedUsers from '../migrations/20260825_zzzzzz_backfill_deleted_user_companies.js';
import removeCompanyCode from '../migrations/20260825_zzzzzzzz_remove_company_code.js';

describe('company data-isolation follow-up migrations', () => {
  it('makes every business company key mandatory while keeping global audits nullable', async () => {
    const query = jest.fn();

    await enforceCompanyNotNull.up({ sequelize: { query } });

    expect(query).toHaveBeenCalledTimes(14);
    expect(
      query.mock.calls.every(([sql]) => sql.includes('company_id BIGINT UNSIGNED NOT NULL')),
    ).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('audit_logs'))).toBe(false);
  });

  it('assigns deleted and active non-admin users to the initial company', async () => {
    const query = jest.fn();

    await backfillDeletedUsers.up({ sequelize: { query } });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("companies.name = 'EI BOURNAZEL Paul'"),
    );
    expect(query.mock.calls[0][0]).not.toContain('users.deleted_at IS NULL');
    expect(query.mock.calls[0][0]).toContain("roles.name = 'ADMIN'");
  });

  it('removes the redundant company code when it exists', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ code: {}, name: {} }),
      removeColumn: jest.fn(),
    };

    await removeCompanyCode.up(queryInterface);

    expect(queryInterface.removeColumn).toHaveBeenCalledWith('companies', 'code');
  });
});
