import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMaterialFileContent } from '../api/material-files.api.js';
import AuthenticatedImage from './AuthenticatedImage.jsx';

vi.mock('../api/material-files.api.js', () => ({ getMaterialFileContent: vi.fn() }));

describe('AuthenticatedImage', () => {
  beforeEach(() => {
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
});
