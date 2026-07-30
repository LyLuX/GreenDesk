import normalizeBooleanFilter from '../src/core/utils/normalize-boolean-filter.js';

describe('normalizeBooleanFilter', () => {
  it.each([
    ['true', true],
    [true, true],
    ['false', false],
    [false, false],
  ])('normalise %p en %p', (value, expected) => {
    expect(normalizeBooleanFilter(value)).toBe(expected);
  });

  it.each(['', undefined, null, 'invalid'])('ignore %p', (value) => {
    expect(normalizeBooleanFilter(value)).toBeUndefined();
  });
});
