import { afterEach, describe, expect, it } from 'vitest';
import { lockPageScroll } from './page-scroll-lock.js';

describe('page scroll lock', () => {
  afterEach(() => document.body.classList.remove('app-scroll-locked'));

  it('keeps scrolling locked until every consumer releases it', () => {
    const releaseFirst = lockPageScroll();
    const releaseSecond = lockPageScroll();

    releaseFirst();
    expect(document.body).toHaveClass('app-scroll-locked');

    releaseSecond();
    expect(document.body).not.toHaveClass('app-scroll-locked');
  });
});
