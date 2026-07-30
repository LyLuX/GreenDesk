import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import ForbiddenPage from './ForbiddenPage.jsx';
import NotFoundPage from './NotFoundPage.jsx';

afterEach(cleanup);

describe.each([
  ['access denied', ForbiddenPage, 'Accès refusé'],
  ['not found', NotFoundPage, 'Page introuvable'],
])('%s status page', (_name, Page, heading) => {
  it('provides a return to the dashboard', () => {
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour au tableau de bord' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
