import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FormField from './FormField.jsx';
import FilterPanel from './FilterPanel.jsx';

afterEach(cleanup);

describe('shared date picker', () => {
  it('uses a top-layer calendar, closes on outside clicks and removes its positioning sheet', async () => {
    const show = vi.fn();
    const hide = vi.fn();
    HTMLElement.prototype.showPopover = show;
    HTMLElement.prototype.hidePopover = hide;
    const originalSheets = document.adoptedStyleSheets ?? [];
    try {
      const user = userEvent.setup();
      render(
        <>
          <FormField label="Date" type="date" />
          <button type="button">Autre action</button>
        </>,
      );
      await user.click(screen.getByRole('button', { name: 'Calendrier : Date' }));
      expect(show).toHaveBeenCalledOnce();
      expect(screen.getByRole('region')).toHaveAttribute('popover', 'manual');
      expect(document.adoptedStyleSheets).toHaveLength(originalSheets.length + 1);
      await user.click(screen.getByRole('button', { name: 'Autre action' }));
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(hide).toHaveBeenCalledOnce();
      expect(document.adoptedStyleSheets).toEqual(originalSheets);
    } finally {
      delete HTMLElement.prototype.showPopover;
      delete HTMLElement.prototype.hidePopover;
    }
  });

  it('selects a leap day and submits an ISO date from an uncontrolled form', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <FormField label="Date d’achat" name="purchaseDate" type="date" defaultValue="2024-02-12" />
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Calendrier : Date d’achat' }));
    expect(screen.getByRole('combobox', { name: 'Mois' })).toHaveValue('1');
    await user.click(screen.getByRole('button', { name: 'jeudi 29 février 2024' }));
    expect(screen.getByLabelText('Date d’achat')).toHaveValue('2024-02-29');
    expect(new FormData(container.querySelector('form')).get('purchaseDate')).toBe('2024-02-29');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calendrier : Date d’achat' })).toHaveFocus();
  });

  it('updates and clears a controlled history filter', async () => {
    const user = userEvent.setup();
    function Filters() {
      const [value, setValue] = useState('2026-09-12');
      return (
        <FilterPanel
          fields={[{ name: 'from', label: 'Depuis', type: 'date', value, onChange: setValue }]}
        />
      );
    }
    render(<Filters />);
    await user.click(screen.getByRole('button', { name: 'Calendrier : Depuis' }));
    await user.click(screen.getByRole('button', { name: 'mardi 15 septembre 2026' }));
    expect(screen.getByLabelText('Depuis')).toHaveValue('2026-09-15');
    await user.click(screen.getByRole('button', { name: 'Calendrier : Depuis' }));
    await user.click(screen.getByRole('button', { name: 'Effacer' }));
    expect(screen.getByLabelText('Depuis')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Depuis'), { target: { value: '2026-08-10' } });
    expect(screen.getByLabelText('Depuis')).toHaveValue('2026-08-10');
  });

  it('respects date limits, required and disabled fields', async () => {
    const user = userEvent.setup();
    render(
      <FormField
        label="Intervention"
        type="date"
        required
        min="2026-09-10"
        max="2026-09-15"
        defaultValue="2026-09-12"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Calendrier : Intervention' }));
    expect(screen.getByRole('button', { name: 'mercredi 9 septembre 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'mercredi 16 septembre 2026' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Effacer' })).not.toBeInTheDocument();
    cleanup();
    render(<FormField label="Intervention" type="date" disabled />);
    expect(screen.getByRole('button', { name: 'Calendrier : Intervention' })).toBeDisabled();
  });

  it('moves across months with arrow keys and consumes Escape inside a parent dialog', async () => {
    const user = userEvent.setup();
    const parentKey = vi.fn();
    render(
      <div onKeyDown={parentKey}>
        <FormField label="Date" type="date" defaultValue="2024-02-29" />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Calendrier : Date' }));
    screen.getByRole('button', { name: 'jeudi 29 février 2024' }).focus();
    await user.keyboard('{ArrowRight}');
    const next = await screen.findByRole('button', { name: 'vendredi 1 mars 2024' });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(next).toHaveFocus();
    parentKey.mockClear();
    await user.keyboard('{Escape}');
    expect(parentKey).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Calendrier : Date' })).toHaveFocus();
  });
});
