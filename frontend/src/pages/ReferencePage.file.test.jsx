import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  api: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  createReferenceApi: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: mocks.createReferenceApi,
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: () => true }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import ReferencePage from './ReferencePage.jsx';

describe('ReferencePage file field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createReferenceApi.mockReturnValue(mocks.api);
    mocks.api.list.mockResolvedValue({ data: { data: [] } });
    mocks.api.create.mockResolvedValue({
      data: { data: { uuid: 'brand-uuid', name: 'ECHO', hasLogo: false } },
    });
  });

  it('uploads the selected file after creating its reference record', async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockResolvedValue({});
    render(
      <ReferencePage
        title="Marques"
        resource="brands"
        createPermission="brands.create"
        updatePermission="brands.update"
        deletePermission="brands.delete"
        fields={[{ name: 'name', label: 'Nom', required: true }]}
        columns={[{ key: 'name', label: 'Nom' }]}
        fileField={{
          name: 'logo',
          label: 'Logo',
          accept: 'image/png',
          hasFile: () => false,
          upload,
          remove: vi.fn(),
        }}
      />,
    );
    await waitFor(() => expect(mocks.api.list).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.type(screen.getByLabelText('Nom'), 'ECHO');
    const logo = new File(['logo'], 'echo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Logo'), logo);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(mocks.api.create).toHaveBeenCalledWith({ name: 'ECHO' });
      expect(upload).toHaveBeenCalledWith('brand-uuid', logo);
    });
  });
});
