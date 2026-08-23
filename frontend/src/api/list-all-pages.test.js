import { describe, expect, it, vi } from 'vitest';
import listAllPages from './list-all-pages.js';

describe('listAllPages', () => {
  it('loads every server page while preserving filters and the abort signal', async () => {
    const signal = new AbortController().signal;
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [{ uuid: 'first' }],
            pagination: { page: 1, limit: 25, total: 2, totalPages: 2 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [{ uuid: 'second' }],
            pagination: { page: 2, limit: 25, total: 2, totalPages: 2 },
          },
        },
      });

    await expect(listAllPages(list, { active: true }, signal)).resolves.toEqual([
      { uuid: 'first' },
      { uuid: 'second' },
    ]);
    expect(list).toHaveBeenNthCalledWith(1, { active: true, page: 1, limit: 25 }, signal);
    expect(list).toHaveBeenNthCalledWith(2, { active: true, page: 2, limit: 25 }, signal);
  });

  it('keeps compatibility with endpoints returning an array', async () => {
    const list = vi.fn().mockResolvedValue({ data: { data: [{ uuid: 'only' }] } });

    await expect(listAllPages(list)).resolves.toEqual([{ uuid: 'only' }]);
    expect(list).toHaveBeenCalledTimes(1);
  });
});
