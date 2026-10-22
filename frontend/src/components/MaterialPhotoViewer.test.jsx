import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MaterialPhotoViewer from './MaterialPhotoViewer.jsx';

vi.mock('./AuthenticatedImage.jsx', () => ({
  default: ({ alt, className }) => <img alt={alt} className={className} />,
}));

const photos = [
  { uuid: 'first', name: 'Moteur' },
  { uuid: 'second', name: 'Plaque' },
];

const props = { photos, selectedUuid: 'first', onSelect: vi.fn(), onClose: vi.fn() };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MaterialPhotoViewer zoom', () => {
  it('zooms within the limits and restores the fitted view and scroll position', async () => {
    const user = userEvent.setup();
    render(<MaterialPhotoViewer {...props} />);
    const enlarge = screen.getByRole('button', { name: 'Agrandir la photo' });
    const reduce = screen.getByRole('button', { name: 'Réduire la photo' });
    const reset = screen.getByRole('button', { name: 'Ajuster à la fenêtre' });
    const viewport = screen.getByRole('region');
    expect(reduce).toBeDisabled();
    expect(reset).toBeDisabled();
    await user.click(enlarge);
    expect(screen.getByLabelText('Niveau de zoom')).toHaveTextContent('150 %');
    for (let step = 0; step < 5; step += 1) await user.click(enlarge);
    expect(enlarge).toBeDisabled();
    expect(screen.getByLabelText('Niveau de zoom')).toHaveTextContent('400 %');
    await user.click(reduce);
    expect(screen.getByLabelText('Niveau de zoom')).toHaveTextContent('350 %');
    viewport.scrollLeft = 120;
    viewport.scrollTop = 80;
    await user.click(reset);
    expect(screen.getByLabelText('Niveau de zoom')).toHaveTextContent('100 %');
    expect(viewport.scrollLeft).toBe(0);
    expect(viewport.scrollTop).toBe(0);
    expect(reduce).toBeDisabled();
  });

  it('resets zoom when changing photos and reopening the viewer', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MaterialPhotoViewer {...props} />);
    await user.click(screen.getByRole('button', { name: 'Agrandir la photo' }));
    await user.click(screen.getByRole('button', { name: 'Photo suivante' }));
    expect(props.onSelect).toHaveBeenCalledWith('second');
    rerender(<MaterialPhotoViewer {...props} selectedUuid="second" />);
    expect(screen.getByLabelText('Niveau de zoom')).toHaveTextContent('100 %');
    await user.click(screen.getByRole('button', { name: 'Agrandir la photo' }));
    rerender(<MaterialPhotoViewer {...props} selectedUuid={null} />);
    rerender(<MaterialPhotoViewer {...props} selectedUuid="second" />);
    expect(screen.getByLabelText('Niveau de zoom')).toHaveTextContent('100 %');
  });

  it('keeps arrow keys for scrolling a zoomed photo while preserving gallery and Escape keys', async () => {
    const user = userEvent.setup();
    render(<MaterialPhotoViewer {...props} />);
    await user.click(screen.getByRole('button', { name: 'Agrandir la photo' }));
    const viewport = screen.getByRole('region');
    viewport.focus();
    const nativeScrollAllowed = fireEvent.keyDown(viewport, { key: 'ArrowRight' });
    expect(nativeScrollAllowed).toBe(true);
    expect(props.onSelect).not.toHaveBeenCalled();
    screen.getByRole('button', { name: 'Photo suivante' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(props.onSelect).toHaveBeenCalledWith('second');
    viewport.focus();
    await user.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledOnce();
  });
});
