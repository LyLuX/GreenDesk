import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCompanyLogo } from '../api/company-logo.api.js';
import { clearAuthenticatedImageCache } from '../utils/authenticated-image-cache.js';
import CompanyLogo from './CompanyLogo.jsx';

vi.mock('../api/company-logo.api.js', () => ({ getCompanyLogo: vi.fn() }));
const company = {
  uuid: 'company-uuid',
  name: 'Jardin Alpha',
  hasLogo: true,
  updatedAt: '2026-09-09T10:00:00.000Z',
};

describe('CompanyLogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthenticatedImageCache();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:company-logo'),
        revokeObjectURL: vi.fn(),
      }),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads the protected logo when the company has one', async () => {
    getCompanyLogo.mockResolvedValue({ data: new Blob(['image'], { type: 'image/png' }) });
    render(<CompanyLogo company={company} />);
    expect(await screen.findByRole('img', { name: 'Logo Jardin Alpha' })).toHaveAttribute(
      'src',
      'blob:company-logo',
    );
    expect(getCompanyLogo).toHaveBeenCalledWith('company-uuid');
    expect(screen.queryByRole('img', { name: 'Logo GreenDesk' })).not.toBeInTheDocument();
  });

  it.each([undefined, { ...company, hasLogo: false }])(
    'uses GreenDesk without requesting a missing logo (%j)',
    (value) => {
      render(<CompanyLogo company={value} className="brand-logo" />);
      expect(screen.getByRole('img', { name: 'Logo GreenDesk' })).toHaveAttribute(
        'src',
        '/logo-greendesk.jpg',
      );
      expect(screen.getByRole('img')).toHaveClass('brand-logo');
      expect(getCompanyLogo).not.toHaveBeenCalled();
    },
  );

  it('falls back to GreenDesk when the protected logo is unavailable', async () => {
    getCompanyLogo.mockRejectedValue(new Error('Logo not found'));
    render(<CompanyLogo company={company} />);
    expect(await screen.findByRole('img', { name: 'Logo GreenDesk' })).toHaveAttribute(
      'src',
      '/logo-greendesk.jpg',
    );
  });

  it('falls back to GreenDesk when the browser cannot decode the downloaded logo', async () => {
    getCompanyLogo.mockResolvedValue({ data: new Blob(['invalid image']) });
    render(<CompanyLogo company={company} />);
    fireEvent.error(await screen.findByRole('img', { name: 'Logo Jardin Alpha' }));
    expect(screen.getByRole('img', { name: 'Logo GreenDesk' })).toHaveAttribute(
      'src',
      '/logo-greendesk.jpg',
    );
  });

  it('resets a failed logo when selecting another company and falls back after removal', async () => {
    getCompanyLogo.mockResolvedValue({ data: new Blob(['image']) });
    const { rerender } = render(<CompanyLogo company={company} />);
    fireEvent.error(await screen.findByRole('img', { name: 'Logo Jardin Alpha' }));
    rerender(<CompanyLogo company={{ ...company, uuid: 'beta', name: 'Beta' }} />);
    expect(await screen.findByRole('img', { name: 'Logo Beta' })).toHaveAttribute(
      'src',
      'blob:company-logo',
    );
    await waitFor(() => expect(getCompanyLogo).toHaveBeenCalledWith('beta'));
    rerender(<CompanyLogo company={{ ...company, uuid: 'beta', name: 'Beta', hasLogo: false }} />);
    expect(screen.getByRole('img', { name: 'Logo GreenDesk' })).toHaveAttribute(
      'src',
      '/logo-greendesk.jpg',
    );
  });
});
