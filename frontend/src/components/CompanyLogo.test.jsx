import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./AuthenticatedImage.jsx', () => ({
  default: ({ alt, cacheKey, className, fallbackAlt, fallbackSrc, fileUuid }) => (
    <img
      alt={alt}
      className={className}
      data-cache-key={cacheKey}
      data-fallback-alt={fallbackAlt}
      data-fallback-src={fallbackSrc}
      data-file-uuid={fileUuid}
    />
  ),
}));

import CompanyLogo from './CompanyLogo.jsx';

describe('CompanyLogo', () => {
  it('loads the protected logo when the company has one', () => {
    render(
      <CompanyLogo
        company={{
          uuid: 'company-uuid',
          name: 'Jardin Alpha',
          hasLogo: true,
          updatedAt: '2026-09-02T21:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Logo Jardin Alpha' })).toHaveAttribute(
      'data-file-uuid',
      'company-uuid',
    );
    expect(screen.getByRole('img', { name: 'Logo Jardin Alpha' })).toHaveAttribute(
      'data-cache-key',
      'company-uuid:2026-09-02T21:00:00.000Z',
    );
    expect(screen.getByRole('img', { name: 'Logo Jardin Alpha' })).toHaveAttribute(
      'data-fallback-src',
      '/logo-greendesk.jpg',
    );
  });

  it('uses the GreenDesk fallback by default when no company logo exists', () => {
    render(
      <CompanyLogo
        company={{ uuid: 'company-uuid', name: 'Jardin Alpha', hasLogo: false }}
        className="brand-logo"
      />,
    );

    expect(screen.getByRole('img', { name: 'Logo GreenDesk' })).toHaveAttribute(
      'src',
      '/logo-greendesk.jpg',
    );
  });
});
