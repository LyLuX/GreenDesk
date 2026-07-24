import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MaterialBrandCell from './MaterialBrandCell.jsx';

vi.mock('./BrandLogo.jsx', () => ({
  default: ({ brand }) => <img alt={`Logo ${brand.name}`} />,
}));

describe('MaterialBrandCell', () => {
  it('shows the logo instead of the brand name when one is available', () => {
    render(
      <MaterialBrandCell
        brand={{ uuid: '22222222-2222-4222-8222-222222222222', name: 'Green', hasLogo: true }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Logo Green' })).toBeInTheDocument();
    expect(screen.queryByText('Green')).not.toBeInTheDocument();
  });

  it('keeps the brand name when no logo is available', () => {
    render(
      <MaterialBrandCell
        brand={{ uuid: '22222222-2222-4222-8222-222222222222', name: 'Green', hasLogo: false }}
      />,
    );

    expect(screen.getByText('Green')).toBeInTheDocument();
  });
});
