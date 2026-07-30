import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FilterPanel from './FilterPanel.jsx';

describe('FilterPanel', () => {
  afterEach(cleanup);

  it('renders a consistently labelled search and forwards selected values', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const onStatus = vi.fn();

    render(
      <FilterPanel
        fields={[
          {
            name: 'search',
            type: 'search',
            ariaLabel: 'Rechercher des éléments',
            value: '',
            onChange: onSearch,
          },
          {
            name: 'active',
            type: 'select',
            label: 'Statut',
            ariaLabel: 'Filtrer par statut',
            emptyLabel: 'Tous les statuts',
            options: [{ value: 'true', label: 'Actifs' }],
            value: '',
            onChange: onStatus,
          },
        ]}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Recherche et filtres' });
    expect(panel).toHaveClass('filter-panel', 'surface', 'mb-1');
    expect(panel).not.toHaveClass('mb-4');
    expect(screen.getByLabelText('Rechercher des éléments').closest('label')).toHaveTextContent(
      /^Recherche/,
    );

    await user.type(screen.getByLabelText('Rechercher des éléments'), 'pompe');
    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'true');

    expect(onSearch).toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith('true');
  });

  it('rejects more than six fields', () => {
    const fields = Array.from({ length: 7 }, (_value, index) => ({
      name: `field-${index}`,
      label: `Champ ${index}`,
      value: '',
      onChange: vi.fn(),
    }));

    expect(() => render(<FilterPanel fields={fields} />)).toThrow(
      'Un panneau de filtres ne peut pas contenir plus de 6 champs.',
    );
  });

  it('rejects more than one search field', () => {
    expect(() =>
      render(
        <FilterPanel
          fields={[
            { name: 'search-a', type: 'search', value: '', onChange: vi.fn() },
            { name: 'search-b', type: 'search', value: '', onChange: vi.fn() },
          ]}
        />,
      ),
    ).toThrow('Un panneau de filtres ne peut contenir qu’un seul champ de recherche.');
  });
});
