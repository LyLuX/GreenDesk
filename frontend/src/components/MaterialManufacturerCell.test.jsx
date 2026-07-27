import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MaterialManufacturerCell from './MaterialManufacturerCell.jsx';

vi.mock('./ManufacturerLogo.jsx', () => ({
  default: ({ manufacturer }) => <img alt={`Logo ${manufacturer.name}`} />,
}));

describe('MaterialManufacturerCell', () => {
  afterEach(cleanup);

  it('shows the logo instead of the manufacturer name when one is available', () => {
    render(
      <MaterialManufacturerCell
        manufacturer={{
          uuid: '22222222-2222-4222-8222-222222222222',
          name: 'Green',
          hasLogo: true,
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Logo Green' })).toBeInTheDocument();
    expect(screen.queryByText('Green')).not.toBeInTheDocument();
  });

  it('uses the logo placeholder instead of the manufacturer name when no logo is available', () => {
    render(
      <MaterialManufacturerCell
        manufacturer={{
          uuid: '22222222-2222-4222-8222-222222222222',
          name: 'Green',
          hasLogo: false,
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Logo Green' })).toBeInTheDocument();
    expect(screen.queryByText('Green')).not.toBeInTheDocument();
  });
});
