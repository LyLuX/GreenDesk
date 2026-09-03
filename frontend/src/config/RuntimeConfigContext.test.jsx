import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../api/client.js', () => ({ default: client }));

import { RuntimeConfigProvider } from './RuntimeConfigContext.jsx';
import useRuntimeConfig from './useRuntimeConfig.js';

function Limits() {
  const { uploadLimits } = useRuntimeConfig();
  return <span>{`${uploadLimits.image.maxSizeMb}/${uploadLimits.document.maxSizeMb}`}</span>;
}

describe('RuntimeConfigProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the upload limits published by the API', async () => {
    client.get.mockResolvedValue({
      data: {
        data: {
          uploadLimits: {
            image: { maxSizeMb: 4, maxSizeBytes: 4 * 1024 * 1024 },
            document: { maxSizeMb: 25, maxSizeBytes: 25 * 1024 * 1024 },
          },
        },
      },
    });

    render(
      <RuntimeConfigProvider>
        <Limits />
      </RuntimeConfigProvider>,
    );

    await waitFor(() => expect(screen.getByText('4/25')).toBeVisible());
    expect(client.get).toHaveBeenCalledWith('/v1', { signal: expect.any(AbortSignal) });
  });

  it('keeps safe defaults when the public configuration is unavailable', async () => {
    client.get.mockRejectedValue(new Error('API unavailable'));

    render(
      <RuntimeConfigProvider>
        <Limits />
      </RuntimeConfigProvider>,
    );

    expect(screen.getByText('10/10')).toBeVisible();
  });
});
