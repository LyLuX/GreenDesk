import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import StatusPanel from './StatusPanel.jsx';

describe('StatusPanel', () => {
  it('renders its content in the shared status surface', () => {
    render(
      <StatusPanel>
        <p>Une information importante</p>
      </StatusPanel>,
    );

    expect(screen.getByText('Une information importante').parentElement).toHaveClass(
      'status-panel',
      'surface',
      'p-4',
      'text-center',
      'm-auto',
      'd-flex',
      'flex-column',
      'align-items-center',
      'justify-content-center',
    );
  });

  it('optionally displays a dashboard return action', () => {
    render(
      <MemoryRouter>
        <StatusPanel showDashboardLink>
          <p>Page inaccessible</p>
        </StatusPanel>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Retour au tableau de bord' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
