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

    expect(referencePage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Fabricants',
        resource: 'manufacturers',
        createPermission: 'manufacturers.create',
        updatePermission: 'manufacturers.update',
        deletePermission: 'manufacturers.delete',
        fields: [{ name: 'name', label: 'Nom', required: true }],
      }),
      undefined,
    );
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
      }),
      undefined,
    );
  });
});
