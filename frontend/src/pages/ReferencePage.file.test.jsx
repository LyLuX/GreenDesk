import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { RuntimeConfigContext } from '../config/RuntimeConfigContext.jsx';

describe('ReferencePage file field', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createReferenceApi.mockReturnValue(mocks.api);
    mocks.api.list.mockResolvedValue({ data: { data: [] } });
    mocks.api.create.mockResolvedValue({
      data: { data: { uuid: 'manufacturer-uuid', name: 'ECHO', hasLogo: false } },
    });
  });

  it('uploads the selected file after creating its reference record', async () => {
    const user = userEvent.setup();
    const upload = vi.fn().mockResolvedValue({});
    render(
      <ReferencePage
        title="Fabricants"
        resource="manufacturers"
        createPermission="manufacturers.create"
        updatePermission="manufacturers.update"
        deletePermission="manufacturers.delete"
        fields={[{ name: 'name', label: 'Nom', required: true }]}
        columns={[{ key: 'name', label: 'Nom' }]}
        fileField={{
          name: 'logo',
          label: 'Logo',
          accept: 'image/png',
          uploadType: 'image',
          help: 'Image PNG',
          hasFile: () => false,
          upload,
          remove: vi.fn(),
        }}
      />,
    );
    await waitFor(() => expect(mocks.api.list).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Créer' }));
    expect(screen.getByText('Image PNG — 10 Mo maximum.')).toBeVisible();
    await user.type(screen.getByLabelText('Nom'), 'ECHO');
    const logo = new File(['logo'], 'echo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Logo'), logo);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(mocks.api.create).toHaveBeenCalledWith({ name: 'ECHO' });
      expect(upload).toHaveBeenCalledWith('manufacturer-uuid', logo);
    });
  });

  it('rejects an oversized file before creating the record', async () => {
    const user = userEvent.setup();
    const upload = vi.fn();
    render(
      <RuntimeConfigContext.Provider
        value={{
          uploadLimits: {
            image: { maxSizeMb: 1, maxSizeBytes: 1 },
            document: { maxSizeMb: 10, maxSizeBytes: 10 * 1024 * 1024 },
          },
        }}
      >
        <ReferencePage
          title="Fabricants"
          resource="manufacturers"
          createPermission="manufacturers.create"
          updatePermission="manufacturers.update"
          deletePermission="manufacturers.delete"
          fields={[{ name: 'name', label: 'Nom', required: true }]}
          columns={[{ key: 'name', label: 'Nom' }]}
          fileField={{
            name: 'logo',
            label: 'Logo',
            accept: 'image/png',
            uploadType: 'image',
            hasFile: () => false,
            upload,
            remove: vi.fn(),
          }}
        />
      </RuntimeConfigContext.Provider>,
    );
    await waitFor(() => expect(mocks.api.list).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.type(screen.getByLabelText('Nom'), 'ECHO');
    await user.upload(
      screen.getByLabelText('Logo'),
      new File(['logo'], 'echo.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le fichier ne doit pas dépasser 1 Mo.',
    );
    expect(mocks.api.create).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
});
