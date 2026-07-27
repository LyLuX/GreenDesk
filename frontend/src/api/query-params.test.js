import { describe, expect, it } from 'vitest';

import compactQueryParams from './query-params.js';

describe('compactQueryParams', () => {
  it('removes cleared filters and preserves meaningful falsy values', () => {
    expect(
      compactQueryParams({
        manufacturerUuid: '',
        categoryUuid: null,
        status: undefined,
        active: false,
        page: 0,
        search: 'tondeuse',
      }),
    ).toEqual({
      active: false,
      page: 0,
      search: 'tondeuse',
    });
  });
});
