import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMaterialFileContent } from '../api/material-files.api.js';
import { clearAuthenticatedImageCache } from '../utils/authenticated-image-cache.js';
import AuthenticatedImage from './AuthenticatedImage.jsx';

vi.mock('../api/material-files.api.js', () => ({ getMaterialFileContent: vi.fn() }));

describe('AuthenticatedImage', () => {
  beforeEach(() => {
    clearAuthenticatedImageCache();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:photo');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows loading then a protected image and revokes its object URL', async () => {
    getMaterialFileContent.mockResolvedValue({ data: new Blob(['image']) });
    const { unmount } = render(<AuthenticatedImage fileUuid="file-uuid" alt="Photo matériel" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Chargement de l’image');
    expect(await screen.findByRole('img', { name: 'Photo matériel' })).toHaveAttribute(
      'src',
      'blob:photo',
    );
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  });

  it('shows an accessible fallback when the request fails', async () => {
    getMaterialFileContent.mockRejectedValue(new Error('offline'));
    render(<AuthenticatedImage fileUuid="file-uuid" alt="Photo matériel" />);
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAccessibleName('Image indisponible : Photo matériel'),
    );
  });

  it('shows the provided image fallback when the protected image request fails', async () => {
    getMaterialFileContent.mockRejectedValue(new Error('offline'));
    render(
      <AuthenticatedImage
        fileUuid="company-uuid"
        alt="Logo société"
        fallbackSrc="/logo-greendesk.jpg"
        fallbackAlt="Logo GreenDesk"
      />,
    );

    expect(await screen.findByRole('img', { name: 'Logo GreenDesk' })).toHaveAttribute(
      'src',
      '/logo-greendesk.jpg',
    );
  });

  it('deduplicates identical authenticated image requests', async () => {
    getMaterialFileContent.mockResolvedValue({ data: new Blob(['image']) });

    render(
      <>
        <AuthenticatedImage fileUuid="shared-file" alt="Première photo" />
        <AuthenticatedImage fileUuid="shared-file" alt="Deuxième photo" />
      </>,
    );

    expect(await screen.findByRole('img', { name: 'Première photo' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Deuxième photo' })).toBeInTheDocument();
    expect(getMaterialFileContent).toHaveBeenCalledTimes(1);
  });

  it('reloads an image after its cache key changes', async () => {
    getMaterialFileContent.mockResolvedValue({ data: new Blob(['first']) });
    const { rerender } = render(
      <AuthenticatedImage fileUuid="company-uuid" cacheKey="company-uuid:v1" alt="Logo société" />,
    );
    await screen.findByRole('img', { name: 'Logo société' });

    clearAuthenticatedImageCache();
    getMaterialFileContent.mockResolvedValue({ data: new Blob(['second']) });
    rerender(
      <AuthenticatedImage fileUuid="company-uuid" cacheKey="company-uuid:v2" alt="Logo société" />,
    );

    await waitFor(() => expect(getMaterialFileContent).toHaveBeenCalledTimes(2));
  });
});
