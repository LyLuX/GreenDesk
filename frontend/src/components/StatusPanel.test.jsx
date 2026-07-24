import { render, screen } from '@testing-library/react';
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
    );
  });
});
