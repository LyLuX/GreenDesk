import { describe, expect, it } from 'vitest';
import { paginateItems } from './pagination.js';

describe('paginateItems', () => {
  const items = Array.from({ length: 12 }, (_value, index) => index + 1);

  it('shows five items by default', () => {
    expect(paginateItems(items)).toEqual({
      items: [1, 2, 3, 4, 5],
      pagination: { page: 1, limit: 5, total: 12, totalPages: 3 },
    });
  });

  it('shows the complete collection when all items are requested', () => {
    expect(paginateItems(items, 2, 'all')).toEqual({
      items,
      pagination: { page: 1, limit: 12, total: 12, totalPages: 1 },
    });
  });
});
