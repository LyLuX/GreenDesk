import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./CompanyLogo.jsx', () => ({
  default: ({ company, className }) => <img alt={`Logo ${company.name}`} className={className} />,
}));

import PrintableBrandHeader from './PrintableBrandHeader.jsx';

describe('PrintableBrandHeader', () => {
  afterEach(cleanup);

  it('uses the active company logo and name', () => {
    render(
      <PrintableBrandHeader
        company={{ uuid: 'company-uuid', name: 'Jardin Alpha', hasLogo: true }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Logo Jardin Alpha' })).toHaveClass('brand-logo');
    expect(screen.getByText('GreenDesk')).toBeVisible();
    expect(screen.getByText('Jardin Alpha')).toBeVisible();
  });

  it('does not repeat GreenDesk next to the fallback logo', () => {
    render(
      <PrintableBrandHeader
        company={{ uuid: 'company-uuid', name: 'Jardin Alpha', hasLogo: false }}
      />,
    );

    expect(screen.queryByText('GreenDesk')).not.toBeInTheDocument();
    expect(screen.getByText('Jardin Alpha')).toBeVisible();
  });
});
