import { describe, expect, it } from 'vitest';
import calendarPosition from './calendar-position.js';

describe('calendar viewport placement', () => {
  const calendar = { width: 384, height: 390 };
  const viewport = { width: 1024, height: 768 };

  it('opens below a field near the top without changing its position', () => {
    expect(calendarPosition({ left: 100, top: 80, bottom: 120 }, calendar, viewport)).toMatchObject(
      { left: 100, top: 128, width: 384 },
    );
  });

  it('opens above a field at the bottom of a modal', () => {
    expect(
      calendarPosition({ left: 100, top: 680, bottom: 720 }, calendar, viewport),
    ).toMatchObject({ left: 100, top: 282 });
  });

  it('keeps all edges visible on a narrow screen even when neither side has enough room', () => {
    const placement = calendarPosition({ left: 260, top: 220, bottom: 260 }, calendar, {
      width: 320,
      height: 430,
    });
    expect(placement).toMatchObject({ left: 8, top: 8, width: 304 });
    expect(placement.top + calendar.height).toBeLessThanOrEqual(422);
  });

  it('uses the visible area after zooming or opening the mobile keyboard', () => {
    const placement = calendarPosition({ left: 250, top: 470, bottom: 510 }, calendar, {
      width: 320,
      height: 280,
      offsetLeft: 100,
      offsetTop: 250,
    });
    expect(placement).toEqual({ left: 108, top: 258, width: 304, maxHeight: 264 });
  });
});
