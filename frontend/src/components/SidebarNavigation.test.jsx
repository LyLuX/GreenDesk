import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SidebarNavigation from './SidebarNavigation.jsx';

describe('SidebarNavigation', () => {
  afterEach(cleanup);

  it('opens the active group and keeps only one dropdown open', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/maintenance/parts']}>
        <SidebarNavigation hasPermission={() => true} onNavigate={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Maintenance' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Pièces' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Gestion du parc' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await user.click(screen.getByRole('button', { name: 'Gestion du parc' }));

    expect(screen.getByRole('button', { name: 'Gestion du parc' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Maintenance' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('hides a complete group when none of its links are permitted', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SidebarNavigation
          hasPermission={(permission) =>
            !permission.startsWith('users.') &&
            !permission.startsWith('roles.') &&
            !permission.startsWith('permissions.') &&
            !permission.startsWith('companies.')
          }
          onNavigate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Administration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Utilisateurs' })).not.toBeInTheDocument();
  });

  it('filters each maintenance link with its dedicated read permission', () => {
    render(
      <MemoryRouter initialEntries={['/maintenance']}>
        <SidebarNavigation
          hasPermission={(permission) => permission === 'maintenance.read'}
          onNavigate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Plans de maintenance' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Opérations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pièces' })).not.toBeInTheDocument();
  });

  it('notifies the drawer after a link is selected', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SidebarNavigation hasPermission={() => true} onNavigate={onNavigate} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Gestion du parc' }));
    await user.click(screen.getByRole('link', { name: 'Matériels' }));

    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
