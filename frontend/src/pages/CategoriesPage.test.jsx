import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { referencePage } = vi.hoisted(() => ({
  referencePage: vi.fn(() => null),
}));

vi.mock('./ReferencePage.jsx', () => ({ default: referencePage }));

import CategoriesPage from './CategoriesPage.jsx';

describe('CategoriesPage', () => {
  it('configures the category CRUD page and its permissions', () => {
    render(<CategoriesPage />);

    expect(referencePage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Catégories',
        resource: 'categories',
        createPermission: 'categories.create',
        updatePermission: 'categories.update',
        deletePermission: 'categories.delete',
      }),
      undefined,
    );
  });
});
