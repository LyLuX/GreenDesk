import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResponsiveTable from './ResponsiveTable.jsx';

let availableWidth;
let contentWidth;
let resizeContainer;
const fixture = (label = 'Nom') => (
  <div>
    <ResponsiveTable className="table">
      <thead>
        <tr>
          <th>{label}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Tracteur</td>
          <td>
            <button>Modifier</button>
          </td>
        </tr>
        <tr>
          <td colSpan={2}>Fin des r�sultats</td>
        </tr>
      </tbody>
    </ResponsiveTable>
  </div>
);

beforeEach(() => {
  availableWidth = 300;
  contentWidth = 400;
  vi.stubGlobal('innerWidth', 390);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback) {
        resizeContainer = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => availableWidth);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => contentWidth);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ResponsiveTable', () => {
  it('reflows only overflowing mobile tables while retaining headers, content and actions', () => {
    render(fixture());
    expect(screen.getByRole('table')).toHaveClass('table-mobile-stacked');
    expect(screen.getByRole('cell', { name: 'Tracteur' })).toHaveAttribute('data-label', 'Nom');
    expect(screen.getByRole('button', { name: 'Modifier' }).closest('td')).toHaveAttribute(
      'data-label',
      'Actions',
    );
    expect(screen.getByRole('columnheader', { name: 'Nom' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Fin des r�sultats' })).toHaveAttribute(
      'data-label',
      '',
    );
  });

  it('keeps the native table when its content fits', () => {
    contentWidth = 280;
    render(fixture());
    expect(screen.getByRole('table')).not.toHaveClass('table-mobile-stacked');
  });

  it('adapts to container resizing and restores columns on desktop', () => {
    render(fixture());
    act(() => {
      availableWidth = 450;
      resizeContainer();
    });
    expect(screen.getByRole('table')).not.toHaveClass('table-mobile-stacked');
    act(() => {
      availableWidth = 300;
      resizeContainer();
    });
    expect(screen.getByRole('table')).toHaveClass('table-mobile-stacked');
    act(() => {
      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByRole('table')).not.toHaveClass('table-mobile-stacked');
  });

  it('refreshes labels when columns change', () => {
    const { rerender } = render(fixture());
    rerender(fixture('Mat�riel'));
    expect(screen.getByRole('cell', { name: 'Tracteur' })).toHaveAttribute(
      'data-label',
      'Mat�riel',
    );
  });
});
