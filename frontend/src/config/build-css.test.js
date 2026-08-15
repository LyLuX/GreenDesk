import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    expect(purgeCssOptions.content).toEqual(['./index.html', './src/**/*.{js,jsx}']);
    expect(purgeCssOptions.safelist.standard).toEqual([
      expect.objectContaining({ test: expect.any(Function) }),
    ]);
    expect(purgeCssOptions.safelist.standard[0].test('app-loader-sm')).toBe(true);
  });

  it('centers consistently sized table shells and prevents horizontal overflow', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(
      /\.table-shell\s*\{[^}]*width:\s*fit-content;[^}]*min-width:\s*min\(100%,\s*48rem\);[^}]*max-width:\s*100%;[^}]*margin-inline:\s*auto;[^}]*overflow:\s*visible;/,
    );
    expect(styles).toMatch(
      /\.table-responsive\s*\{[^}]*max-width:\s*100%;[^}]*overflow-x:\s*visible;/,
    );
    expect(styles).toMatch(
      /\.table-responsive\s*>\s*\.table\s*\{[^}]*width:\s*auto;[^}]*min-width:\s*min\(100%,\s*48rem\);[^}]*max-width:\s*100%;[^}]*white-space:\s*normal;/,
    );
    expect(styles).not.toMatch(/\.history-table\s*\{[^}]*min-width:/);
    expect(styles).not.toMatch(/\.maintenance-order-list-table\s*\{[^}]*min-width:/);
  });
});
