import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getReference: vi.fn(),
  hasPermission: vi.fn(),
  history: [],
  listMaintenance: vi.fn(),
  uploadPhoto: vi.fn(),
}));

vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: () => ({ get: mocks.getReference }),
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('../api/material-files.api.js', () => ({
  deleteMaterialFile: vi.fn(),
  downloadMaterialFile: vi.fn(),
  setPrimaryMaterialPhoto: vi.fn(),
  uploadMaterialDocument: vi.fn(),
  uploadMaterialPhoto: mocks.uploadPhoto,
}));
vi.mock('../api/maintenance.api.js', () => ({
  listMaintenance: mocks.listMaintenance,
}));
vi.mock('../components/ManufacturerLogo.jsx', () => ({
  default: ({ manufacturer }) => <img alt={`Logo ${manufacturer.name}`} />,
}));

import MaterialDetailPage from './MaterialDetailPage.jsx';

describe('MaterialDetailPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:preview');
    URL.revokeObjectURL = vi.fn();
    mocks.history = [];
    mocks.hasPermission.mockReturnValue(false);
    mocks.listMaintenance.mockResolvedValue({ data: { data: { items: [] } } });
    mocks.getReference.mockImplementation((path) =>
      Promise.resolve({
        data: {
          data: path.endsWith('/history')
            ? mocks.history
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

  it('enables the file upload buttons after selecting valid files', async () => {
    mocks.hasPermission.mockImplementation((permission) => permission === 'materials.update');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/materials/material-uuid']}>
        <Routes>
          <Route path="/materials/:uuid" element={<MaterialDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText('Ajouter des photos');
    const submit = screen.getByRole('button', { name: 'Envoyer les photos' });
    expect(submit).toBeDisabled();

    await user.upload(input, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));

    expect(submit).toBeEnabled();
    expect(screen.getByAltText('Aperçu photo.jpg')).toBeVisible();

    const documentInput = screen.getByLabelText('Ajouter un document');
    const documentSubmit = screen.getByRole('button', { name: 'Envoyer le document' });
    expect(documentSubmit).toBeDisabled();

    await user.upload(
      documentInput,
      new File(['document'], 'facture.pdf', { type: 'application/pdf' }),
    );

    expect(documentSubmit).toBeEnabled();
    expect(screen.getByText('Fichier sélectionné : facture.pdf')).toBeVisible();
  });

  it('shows friendly history labels and ignores equivalent decimal prices', async () => {
    mocks.history = [
      {
        uuid: 'history-uuid',
        action: 'UPDATE',
        createdAt: '2026-07-30T10:00:00.000Z',
        user: { firstName: 'Paul', lastName: 'Bournazel' },
        oldValues: { name: 'Tondeuse', purchasePrice: '25.50', manufacturer: 'Green' },
        newValues: { name: 'Tondeuse pro', purchasePrice: 25.5, manufacturer: 'GreenDesk' },
      },
    ];
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/materials/material-uuid']}>
        <Routes>
          <Route path="/materials/:uuid" element={<MaterialDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('img', { name: 'Logo Green' });
    await user.click(screen.getByRole('tab', { name: 'Historique' }));

    expect(screen.getByText('Fabricant')).toBeVisible();
    expect(screen.getByText('GreenDesk')).toBeVisible();
    expect(screen.getByText('Nom')).toBeVisible();
    expect(screen.queryByText('Prix d’achat')).not.toBeInTheDocument();
  });

  it('opens all maintenance plans filtered by the current material', async () => {
    mocks.hasPermission.mockImplementation((permission) => permission === 'maintenance.read');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/materials/material-uuid']}>
        <Routes>
          <Route path="/materials/:uuid" element={<MaterialDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('img', { name: 'Logo Green' });
    await user.click(screen.getByRole('tab', { name: 'Maintenance' }));

    expect(screen.getByRole('link', { name: 'Voir la maintenance' })).toHaveAttribute(
      'href',
      '/maintenance?materialUuid=material-uuid&limit=all',
    );
  });
});
