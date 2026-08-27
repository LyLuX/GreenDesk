import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { hasPermission, referencePage } = vi.hoisted(() => ({
  hasPermission: vi.fn(),
  referencePage: vi.fn(() => null),
}));

vi.mock('./ReferencePage.jsx', () => ({ default: referencePage }));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission, refreshCompanies: vi.fn() }),
}));

import CompaniesPage from './CompaniesPage.jsx';

describe('CompaniesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('configures deleted-company visibility and restoration permissions', () => {
    hasPermission.mockImplementation((permission) => permission === 'companies.deleted.read');

    render(<CompaniesPage />);

    const props = referencePage.mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        title: 'Sociétés',
        resource: 'companies',
        deletedUpdatePermission: 'companies.deleted.update',
      }),
    );
    expect(props.filters[0].options).toContainEqual({ value: 'deleted', label: 'Supprimées' });
    expect(props.filters[0].toQuery('deleted')).toEqual({ deleted: true });
    expect(props.filters[0].toQuery('false')).toEqual({ active: 'false' });
  });

  it('hides the deleted-company filter without its read permission', () => {
    hasPermission.mockReturnValue(false);

    render(<CompaniesPage />);

    expect(referencePage.mock.calls[0][0].filters[0].options).not.toContainEqual(
      expect.objectContaining({ value: 'deleted' }),
    );
  });
});
