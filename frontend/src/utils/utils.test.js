import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatOperationDateTime,
} from './formatters.js';
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
  it('formats dates consistently in the French numeric format', () => {
    expect(formatDate('2026-07-30')).toBe('30/07/2026');
    expect(formatDateTime('2026-07-30T10:15:00.000Z')).toBe('30/07/2026 12:15');
    expect(formatOperationDateTime('2026-07-29', '2026-07-30T10:15:00.000Z')).toBe(
      '29/07/2026 12:15',
    );
    expect(formatOperationDateTime('2026-07-30T10:15:00.000Z', '2026-07-30T11:15:00.000Z')).toBe(
      '30/07/2026 12:15',
    );
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime(null, 'Jamais')).toBe('Jamais');
  });
  it('treats malformed tokens as expired', () => {
    expect(isJwtExpired('bad-token')).toBe(true);
  });
});
