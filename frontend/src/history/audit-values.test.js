import { describe, expect, it } from 'vitest';

import { auditValuesAreEqual } from './audit-values.js';

describe('auditValuesAreEqual', () => {
  it.each([
    ['purchasePrice', '950.00', 950],
    ['unitPrice', '12.50', 12.5],
    ['quantityOnHand', '3.00', 3],
    ['minimumStock', '1.00', 1],
  ])('compares %s by its numeric value', (key, before, after) => {
    expect(auditValuesAreEqual(key, before, after)).toBe(true);
  });

  it('keeps numeric-looking text changes distinct', () => {
    expect(auditValuesAreEqual('serialNumber', '001', '1')).toBe(false);
  });

  it('does not treat a missing numeric value as zero', () => {
    expect(auditValuesAreEqual('purchasePrice', null, 0)).toBe(false);
  });
});
