import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../auth/useAuth.js', () => ({
  default: () => ({
    user: { firstName: 'Paul', lastName: 'Bournazel' },
    activeCompany: { uuid: 'company-uuid', name: 'Société actuellement consultée' },
    companies: [{ uuid: 'company-uuid', name: 'Société actuellement consultée' }],
    logout: mocks.logout,
    hasPermission: () => true,
  }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));

import AppLayout from './AppLayout.jsx';

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<h1>Tableau de bord</h1>} />
          <Route path="/materials" element={<h1>Matériels</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('AppLayout navigation drawer', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.body.classList.remove('app-scroll-locked');
  });

  it('shows the currently selected company in the brand', () => {
    const { container } = renderLayout();

    expect(container.querySelector('.brand-company')).toHaveTextContent(
      'Société actuellement consultée',
    );
  });

  it('opens from the header and closes with Escape', async () => {
    const user = userEvent.setup();
    renderLayout();

    const menuButton = screen.getByRole('button', { name: 'Menu' });
    const navigation = screen.getByRole('navigation', { name: 'Navigation principale' });
    await user.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(navigation).toHaveClass('open');
    expect(screen.getByRole('button', { name: 'Fermer le menu' })).toHaveFocus();
    expect(document.body).toHaveClass('app-scroll-locked');

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Administration' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(navigation).not.toHaveClass('open');
    expect(menuButton).toHaveFocus();
  });

  it('closes the drawer after navigating to a page', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('button', { name: 'Gestion du parc' }));
    await user.click(screen.getByRole('link', { name: 'Matériels' }));

    expect(await screen.findByRole('heading', { name: 'Matériels' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).not.toHaveClass(
      'open',
    );
  });
});
