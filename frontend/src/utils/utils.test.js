import { describe, expect, it } from 'vitest';
import { formatCurrency } from './formatters.js';
import normalizeFormValues from './normalize-form-values.js';
import { isJwtExpired } from '../auth/jwt.js';

describe('frontend value utilities', () => {
  it('normalizes price fields to numbers', () => {
    const fields = [
      { name: 'purchasePrice', label: 'Prix achat', required: true, valueType: 'number' },
    ];
    expect(normalizeFormValues({ purchasePrice: '25.50' }, fields)).toEqual({
      purchasePrice: 25.5,
    });
  });
  it('formats monetary and missing values safely', () => {
    expect(formatCurrency('25.5')).toBe('25,50 €');
    expect(formatCurrency(null)).toBe('—');
  });
  it('treats malformed tokens as expired', () => {
    expect(isJwtExpired('bad-token')).toBe(true);
  });
});
