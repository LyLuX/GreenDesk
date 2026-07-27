import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getReference: vi.fn(),
}));

vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: () => ({ get: mocks.getReference }),
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: () => false }),
}));
vi.mock('../components/ManufacturerLogo.jsx', () => ({
  default: ({ manufacturer }) => <img alt={`Logo ${manufacturer.name}`} />,
}));

import MaterialDetailPage from './MaterialDetailPage.jsx';

describe('MaterialDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getReference.mockImplementation((path) =>
      Promise.resolve({
        data: {
          data: path.endsWith('/history')
            ? []
            : {
                uuid: 'material-uuid',
                name: 'Tronçonneuse',
                manufacturer: {
                  uuid: 'manufacturer-uuid',
                  name: 'Green',
                  hasLogo: true,
                },
                files: [],
              },
        },
      }),
    );
  });

  it('shows the manufacturer logo instead of its name', async () => {
    render(
      <MemoryRouter initialEntries={['/materials/material-uuid']}>
        <Routes>
          <Route path="/materials/:uuid" element={<MaterialDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('img', { name: 'Logo Green' })).toBeVisible();
    expect(screen.queryByText('Green')).not.toBeInTheDocument();
  });
});
