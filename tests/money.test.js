import { multiplyMoney, normalizeMoney } from '../src/core/utils/money.js';

describe('money helpers', () => {
  it('normalizes prices to two decimals and rejects invalid amounts', () => {
    expect(normalizeMoney(12.5)).toBe('12.50');
    expect(normalizeMoney(1.005)).toBe('1.01');
    expect(normalizeMoney(-1)).toBeNull();
    expect(normalizeMoney('invalid')).toBeNull();
  });

  it('multiplies quantities using integer cents', () => {
    expect(multiplyMoney('12.50', 3)).toBe('37.50');
    expect(multiplyMoney('0.10', 3)).toBe('0.30');
  });
});
