import { beforeEach, describe, expect, it } from 'vitest';

import { ACTIVE_COMPANY_STORAGE_KEY, resolveActiveCompany } from './company.storage.js';

const companies = [
  { uuid: 'zulu-uuid', name: 'Zulu' },
  { uuid: 'alpha-uuid', name: 'Alpha' },
  { uuid: 'echo-uuid', name: 'Écho' },
];

describe('active company storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves a valid selection while the same session continues', () => {
    localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, 'zulu-uuid');

    expect(resolveActiveCompany(companies)).toEqual(companies[0]);
  });

  it('selects the first company alphabetically for a new session', () => {
    localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, 'zulu-uuid');

    expect(resolveActiveCompany(companies, { preserveSelection: false })).toEqual(companies[1]);
    expect(localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY)).toBe('alpha-uuid');
  });
});
