import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import TableActions from './TableActions.jsx';

afterEach(cleanup);

describe('TableActions', () => {
  it('groups management separately from state changes and preserves keyboard order', async () => {
    const user = userEvent.setup();
    render(
      <TableActions
        secondary={
          <>
            <button>Désactiver</button>
            <button>Supprimer</button>
          </>
        }
      >
        <button>Stock</button>
        <button>Modifier</button>
      </TableActions>,
    );
    expect(
      within(screen.getByRole('group', { name: 'Gestion' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Stock', 'Modifier']);
    expect(
      within(screen.getByRole('group', { name: 'État et suppression' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Désactiver', 'Supprimer']);
    for (const label of ['Stock', 'Modifier', 'Désactiver', 'Supprimer']) {
      await user.tab();
      expect(screen.getByRole('button', { name: label })).toHaveFocus();
    }
  });

  it('omits empty permission groups, including nested fragments', () => {
    const { rerender, container } = render(
      <TableActions secondary={<>{false && <button>Supprimer</button>}</>}>
        <button>Stock</button>
      </TableActions>,
    );
    expect(screen.getAllByRole('group')).toHaveLength(1);
    rerender(<TableActions secondary={<>{null}</>}>{false}</TableActions>);
    expect(container).toBeEmptyDOMElement();
  });
});
