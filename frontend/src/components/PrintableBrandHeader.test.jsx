import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./CompanyLogo.jsx', () => ({
  default: ({ company, className }) => <img alt={`Logo ${company.name}`} className={className} />,
}));

import PrintableBrandHeader from './PrintableBrandHeader.jsx';

describe('PrintableBrandHeader', () => {
  it('uses the active company logo and name', () => {
    render(
      <PrintableBrandHeader
        company={{ uuid: 'company-uuid', name: 'Jardin Alpha', hasLogo: true }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Logo Jardin Alpha' })).toHaveClass('brand-logo');
    expect(screen.getByText('Jardin Alpha')).toBeVisible();
  });
});
