import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  notify: vi.fn(),
  activeCompany: { uuid: 'company-uuid', name: 'Société actuellement consultée' },
  companies: [{ uuid: 'company-uuid', name: 'Société actuellement consultée' }],
  selectCompany: vi.fn(),
}));

vi.mock('../auth/useAuth.js', () => ({
  default: () => ({
    user: { firstName: 'Paul', lastName: 'Bournazel' },
    activeCompany: mocks.activeCompany,
    companies: mocks.companies,
    selectCompany: mocks.selectCompany,
    logout: mocks.logout,
    hasPermission: () => true,
  }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));
vi.mock('../components/CompanyLogo.jsx', () => ({
  default: ({ company, className }) => (
    <img alt={`Logo ${company?.name ?? 'GreenDesk'}`} className={className} />
  ),
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
    mocks.activeCompany = { uuid: 'company-uuid', name: 'Société actuellement consultée' };
    mocks.companies = [mocks.activeCompany];
    document.body.classList.remove('app-scroll-locked');
  });

  it('opens company choices with the keyboard and selects another company', async () => {
    const user = userEvent.setup();
    mocks.companies = [mocks.activeCompany, { uuid: 'other-company-uuid', name: 'Autre société' }];

    renderLayout();

    const trigger = screen.getByRole('button', { name: /Changer de société :/ });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Société actuellement consultée' })).toHaveFocus();
    expect(document.activeElement).toHaveAttribute('aria-current', 'true');
    await user.tab();
    await user.keyboard('{Enter}');
    expect(mocks.selectCompany).toHaveBeenCalledWith('other-company-uuid');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes company choices on Escape, outside click and focus leaving', async () => {
    const user = userEvent.setup();
    mocks.companies = [mocks.activeCompany, { uuid: 'other', name: 'Autre société' }];
    renderLayout();
    const trigger = screen.getByRole('button', { name: /Changer de société :/ });
    await user.click(trigger);
    await user.tab();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    await user.click(screen.getByRole('heading', { name: 'Tableau de bord' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    await user.tab({ shift: true });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the currently selected company in the brand', () => {
    const { container } = renderLayout();

    expect(screen.queryByRole('button', { name: /Changer de société/ })).not.toBeInTheDocument();

    expect(container.querySelector('.brand-company')).toHaveTextContent(
      'Société actuellement consultée',
    );
    expect(screen.getByRole('img', { name: 'Logo Société actuellement consultée' })).toHaveClass(
      'brand-logo',
    );
    expect(container.querySelector('.brand-name')).toHaveTextContent('GreenDesk');
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toHaveClass('btn-outline-critical');
    expect(screen.getByRole('button', { name: 'Déconnexion' })).not.toHaveClass(
      'btn-outline-light',
    );
  });

  it('keeps the product name when an actual company logo replaces the GreenDesk logo', () => {
    mocks.activeCompany = { ...mocks.activeCompany, hasLogo: true };
    mocks.companies = [mocks.activeCompany];

    const { container } = renderLayout();

    expect(container.querySelector('.brand-name')).toHaveTextContent('GreenDesk');
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
