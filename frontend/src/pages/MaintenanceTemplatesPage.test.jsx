import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listMaintenanceTemplates: vi.fn().mockResolvedValue({
    data: {
      data: [
        {
          uuid: 'template-echo',
          title: 'Bougie',
          maintenanceType: 'replacement',
          intervalDays: 365,
          priority: 'normal',
          partReference: 'BPMR8Y',
          quantity: 1,
          materialModel: 'CS-621SX',
          brand: { uuid: 'brand-echo', name: 'ECHO' },
        },
      ],
    },
  }),
  listMaterials: vi.fn().mockResolvedValue({ data: { data: [] } }),
}));

vi.mock('../api/maintenance-template.api.js', () => ({
  createMaintenanceTemplate: vi.fn(),
  deleteMaintenanceTemplate: vi.fn(),
  listMaintenanceTemplates: mocks.listMaintenanceTemplates,
  updateMaintenanceTemplate: vi.fn(),
}));
vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: () => ({ list: mocks.listMaterials }),
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: () => true }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));

import MaintenanceTemplatesPage from './MaintenanceTemplatesPage.jsx';

describe('MaintenanceTemplatesPage', () => {
  afterEach(cleanup);

  it('shows the compatibility scope and material-specific reference', async () => {
    render(
      <MemoryRouter>
        <MaintenanceTemplatesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('ECHO CS-621SX')).toBeInTheDocument();
    expect(screen.getByText('BPMR8Y × 1')).toBeInTheDocument();
    expect(screen.getByText('365 jours')).toBeInTheDocument();
  });
});
