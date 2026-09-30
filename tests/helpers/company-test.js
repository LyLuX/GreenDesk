import { it } from '@jest/globals';
import { runWithCompanyScope } from '../../src/core/company/company-context.js';

export const testCompany = Object.freeze({
  companyId: 1,
  companyUuid: 'a2b3c4d5-6e7f-4890-ab12-34567890cdef',
  accessAll: false,
});

/** Gives nominal business tests an explicit scope without changing production defaults. */
export const companyTest = (name, callback, timeout) =>
  it(name, () => runWithCompanyScope(testCompany, callback), timeout);
companyTest.each =
  (...table) =>
  (name, callback, timeout) =>
    it.each(...table)(
      name,
      (...args) => runWithCompanyScope(testCompany, () => callback(...args)),
      timeout,
    );
