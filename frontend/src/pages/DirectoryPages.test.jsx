import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { referencePage } = vi.hoisted(() => ({
  referencePage: vi.fn(() => null),
}));

vi.mock('./ReferencePage.jsx', () => ({ default: referencePage }));

import ManufacturersPage from './ManufacturersPage.jsx';
import SuppliersPage from './SuppliersPage.jsx';

describe('global business directory pages', () => {
  it('uses the global manufacturer resource and permissions', () => {
    render(<ManufacturersPage />);

    const properties = referencePage.mock.calls[0][0];
    expect(referencePage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Fabricants',
        resource: 'manufacturers',
        createPermission: 'manufacturers.create',
        updatePermission: 'manufacturers.update',
        deletePermission: 'manufacturers.delete',
        statusAction: true,
        fields: [{ name: 'name', label: 'Nom', required: true }],
      }),
      undefined,
    );
    expect(properties.columns.map((column) => column.key)).toEqual(['hasLogo', 'active']);
  });

  it('uses the global supplier resource and permissions', () => {
    render(<SuppliersPage />);

    expect(referencePage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Fournisseurs',
        resource: 'suppliers',
        createPermission: 'suppliers.create',
        updatePermission: 'suppliers.update',
        deletePermission: 'suppliers.delete',
        statusAction: true,
      }),
      undefined,
    );
  });
});
