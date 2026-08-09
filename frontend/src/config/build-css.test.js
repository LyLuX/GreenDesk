import { describe, expect, it } from 'vitest';

import { createPostCssPlugins, purgeCssOptions } from '../../build/css.js';

describe('production CSS build', () => {
  it('enables PurgeCSS only for production builds', () => {
    expect(createPostCssPlugins('serve')).toEqual([]);
    expect(createPostCssPlugins('build')).toEqual([
      expect.objectContaining({ postcssPlugin: 'postcss-purgecss' }),
    ]);
  });

  it('scans React sources and preserves dynamically generated loader classes', () => {
    expect(purgeCssOptions.content).toEqual([
      './index.html',
      './src/**/*.{js,jsx}',
    ]);
    expect(purgeCssOptions.safelist.standard).toEqual([
      expect.objectContaining({ test: expect.any(Function) }),
    ]);
    expect(purgeCssOptions.safelist.standard[0].test('app-loader-sm')).toBe(true);
  });
});
