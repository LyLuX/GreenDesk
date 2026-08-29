import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getReference: vi.fn(),
  hasPermission: vi.fn(),
  history: [],
  listMaintenance: vi.fn(),
  listInterventions: vi.fn(),
  materialFiles: [],
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
  listMaintenanceInterventions: mocks.listInterventions,
}));
vi.mock('../components/ManufacturerLogo.jsx', () => ({
  default: ({ manufacturer }) => <img alt={`Logo ${manufacturer.name}`} />,
}));
vi.mock('../components/AuthenticatedImage.jsx', () => ({
  default: ({ alt, className, fileUuid }) => (
    <img alt={alt} className={className} data-file-uuid={fileUuid} />
  ),
}));

import MaterialDetailPage from './MaterialDetailPage.jsx';

describe('MaterialDetailPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:preview');
    URL.revokeObjectURL = vi.fn();
    mocks.history = [];
    mocks.materialFiles = [];
    mocks.uploadPhoto.mockResolvedValue({ data: { data: { uuid: 'uploaded-photo' } } });
    mocks.hasPermission.mockReturnValue(false);
    mocks.listMaintenance.mockResolvedValue({ data: { data: { items: [] } } });
    mocks.listInterventions.mockResolvedValue({ data: { data: { items: [] } } });
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
                files: mocks.materialFiles,
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
    mocks.hasPermission.mockImplementation((permission) =>
      ['materials.photos.create', 'materials.documents.create'].includes(permission),
    );
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
    const photoName = screen.getByRole('textbox', { name: 'Nom de la photo photo.jpg' });
    await user.type(photoName, 'Vue du moteur');
    await user.click(submit);
    await waitFor(() =>
      expect(mocks.uploadPhoto).toHaveBeenCalledWith(
        'material-uuid',
        expect.objectContaining({ name: 'photo.jpg' }),
        'Vue du moteur',
        expect.any(Function),
      ),
    );

    const documentInput = screen.getByLabelText('Ajouter un document');
    const documentSubmit = screen.getByRole('button', { name: 'Envoyer le document' });
    const documentType = screen.getByRole('combobox', { name: 'Type de document' });
    expect(documentSubmit).toBeDisabled();
    expect(within(documentType).getByRole('option', { name: 'Vue éclatée' })).toHaveValue(
      'exploded_view',
    );
    expect(within(documentType).getByRole('option', { name: 'Listing de pièces' })).toHaveValue(
      'parts_list',
    );

    await user.upload(
      documentInput,
      new File(['document'], 'facture.pdf', { type: 'application/pdf' }),
    );

    expect(documentSubmit).toBeEnabled();
    expect(screen.getByText('Fichier sélectionné : facture.pdf')).toBeVisible();
  });

  it('opens stored photos in an accessible gallery and browses them with buttons and keys', async () => {
    mocks.materialFiles = [
      {
        uuid: 'primary-photo',
        kind: 'photo',
        name: 'Capot avant',
        originalName: 'Vue avant.jpg',
        isPrimary: true,
        createdAt: '2026-08-28T08:30:00.000Z',
      },
      {
        uuid: 'second-photo',
        kind: 'photo',
        originalName: 'Vue arrière.jpg',
        isPrimary: false,
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

    await user.click(
      await screen.findByRole('button', { name: 'Voir la photo principale de Tronçonneuse' }),
    );

    const gallery = screen.getByRole('dialog', { name: 'Photo du matériel' });
    expect(within(gallery).getByText('1 sur 2')).toBeVisible();
    expect(within(gallery).getByAltText('Capot avant')).toHaveAttribute(
      'data-file-uuid',
      'primary-photo',
    );
    expect(within(gallery).getByText('Fichier : Vue avant.jpg')).toBeVisible();
    expect(within(gallery).getByText('Photo principale')).toBeVisible();
    expect(within(gallery).getByText('Ajoutée le 28/08/2026 10:30')).toBeVisible();

    await user.click(within(gallery).getByRole('button', { name: 'Photo suivante' }));
    expect(within(gallery).getByText('2 sur 2')).toBeVisible();
    expect(within(gallery).getByAltText('Vue arrière.jpg')).toHaveAttribute(
      'data-file-uuid',
      'second-photo',
    );

    await user.keyboard('{ArrowLeft}');
    expect(within(gallery).getByAltText('Capot avant')).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Photo du matériel' })).not.toBeInTheDocument();
  });

  it('opens a stored photo from its thumbnail', async () => {
    mocks.materialFiles = [
      {
        uuid: 'stored-photo',
        kind: 'photo',
        originalName: 'Moteur.jpg',
        isPrimary: false,
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

    await user.click(await screen.findByRole('button', { name: 'Voir Moteur.jpg' }));

    expect(
      within(screen.getByRole('dialog', { name: 'Photo du matériel' })).getByAltText('Moteur.jpg'),
    ).toBeVisible();
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

    expect(screen.getByText('30/07/2026 12:00')).toBeVisible();
    expect(screen.getByText('Fabricant')).toBeVisible();
    expect(screen.getByText('GreenDesk')).toBeVisible();
    expect(screen.getByText('Nom')).toBeVisible();
    expect(screen.queryByText('Prix d’achat')).not.toBeInTheDocument();
  });

  it('uses the GreenDesk badge color assigned to each history action', async () => {
    mocks.history = [
      { uuid: 'create', action: 'CREATE', createdAt: '2026-07-27T10:00:00.000Z' },
      { uuid: 'update', action: 'UPDATE', createdAt: '2026-07-28T10:00:00.000Z' },
      { uuid: 'restore', action: 'RESTORE', createdAt: '2026-07-29T10:00:00.000Z' },
      { uuid: 'delete', action: 'DELETE', createdAt: '2026-07-30T10:00:00.000Z' },
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

    expect(screen.getByText('Création')).toHaveClass('status-badge', 'audit-create');
    expect(screen.getByText('Modification')).toHaveClass('status-badge', 'audit-update');
    expect(screen.getByText('Restauration')).toHaveClass('status-badge', 'audit-restore');
    expect(screen.getByText('Suppression')).toHaveClass('status-badge', 'audit-delete');
  });

  it('paginates material history with the shared GreenDesk controls', async () => {
    mocks.history = Array.from({ length: 6 }, (_, index) => ({
      uuid: `history-${index + 1}`,
      action: 'UPDATE',
      createdAt: `2026-07-${String(30 - index).padStart(2, '0')}T10:00:00.000Z`,
      oldValues: { name: `Ancien nom ${index + 1}` },
      newValues: { name: `Nouveau nom ${index + 1}` },
    }));
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

    expect(screen.getByText('6 événement(s), page 1 sur 2')).toBeVisible();
    expect(screen.getByText('Nouveau nom 1')).toBeVisible();
    expect(screen.queryByText('Nouveau nom 6')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(screen.getByText('6 événement(s), page 2 sur 2')).toBeVisible();
    expect(screen.getByText('Nouveau nom 6')).toBeVisible();
  });

  it('paginates material maintenance with the shared GreenDesk controls', async () => {
    mocks.hasPermission.mockImplementation((permission) => permission === 'maintenance.read');
    mocks.listMaintenance.mockImplementation(({ page }) =>
      Promise.resolve({
        data: {
          data: {
            items: [
              {
                uuid: `maintenance-${page}`,
                title: `Entretien page ${page}`,
                nextMaintenanceDate: '2026-08-15',
                status: 'upcoming',
              },
            ],
            pagination: { page, limit: 5, total: 6, totalPages: 2 },
          },
        },
      }),
    );
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

    expect(await screen.findByText('Entretien page 1')).toBeVisible();
    expect(screen.getByText('6 plan(s) d’entretien, page 1 sur 2')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByText('Entretien page 2')).toBeVisible();
    expect(mocks.listMaintenance).toHaveBeenLastCalledWith(
      { materialUuid: 'material-uuid', page: 2, limit: 5 },
      expect.any(AbortSignal),
    );
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
      '/maintenance?materialUuid=material-uuid',
    );
  });

  it('shows unplanned interventions in the material maintenance history', async () => {
    mocks.hasPermission.mockImplementation((permission) => permission === 'maintenance.read');
    mocks.listInterventions.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'intervention-uuid',
              description: 'Remplacement d’une grille cassée',
              performedAt: '2026-08-20',
              createdAt: '2026-08-20T08:15:00.000Z',
              parts: [{ name: 'Grille', quantity: 1, unit: 'pièce' }],
              totalCost: 18.5,
              performedByUser: { firstName: 'Paul', lastName: 'Bournazel' },
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });
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

    expect(await screen.findByText('Remplacement d’une grille cassée')).toBeVisible();
    expect(screen.getByText('20/08/2026 10:15')).toBeVisible();
    expect(screen.getByText('Grille (1 pièce)')).toBeVisible();
    expect(screen.getByText('Paul Bournazel')).toBeVisible();
    expect(mocks.listInterventions).toHaveBeenCalledWith(
      { materialUuid: 'material-uuid', page: 1, limit: 5 },
      expect.any(AbortSignal),
    );
  });
});
