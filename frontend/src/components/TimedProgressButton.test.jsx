import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TimedProgressButton, { createTimedCooldown } from './TimedProgressButton.jsx';

describe('TimedProgressButton', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('fills with elapsed time and restores the original enabled button', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T12:00:00.000Z'));
    render(<TimedProgressButton cooldown={createTimedCooldown(2)}>Renvoyer</TimedProgressButton>);

    const button = screen.getByRole('button', { name: 'Disponible dans 2 s' });
    expect(button).toBeDisabled();
    expect(button.querySelector('progress')).toHaveValue(0);

    act(() => vi.advanceTimersByTime(1000));
    expect(
      screen.getByRole('button', { name: 'Disponible dans 1 s' }).querySelector('progress'),
    ).toHaveValue(50);

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Renvoyer' })).toBeEnabled();
  });

  it('uses the same progress layer and disables the button while busy', () => {
    render(<TimedProgressButton busy>Renvoyer</TimedProgressButton>);

    const button = screen.getByRole('button', { name: 'Traitement…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveClass('is-busy');
  });
});
