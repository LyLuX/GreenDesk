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
      /\.table-responsive\s*>\s*\.table\s*\{[^}]*min-width:\s*min\(100%,\s*48rem\);[^}]*max-width:\s*100%;[^}]*white-space:\s*normal;/,
    );
    const responsiveTableRule = styles.match(/\.table-responsive\s*>\s*\.table\s*\{([^}]*)\}/)?.[1];
    expect(responsiveTableRule).not.toMatch(/(?:^|;)\s*width\s*:/);
    expect(styles).not.toMatch(/\.history-table\s*\{[^}]*min-width:/);
    expect(styles).not.toMatch(/\.maintenance-order-list-table\s*\{[^}]*min-width:/);
    expect(styles).toMatch(
      /\.modal-surface\.maintenance-order-list-modal\s*\{[^}]*width:\s*fit-content;[^}]*min-width:\s*min\(51rem,\s*calc\(100vw\s*-\s*3rem\)\);[^}]*max-width:\s*min\(76rem,\s*calc\(100vw\s*-\s*3rem\)\);/,
    );
  });

  it('preserves user-entered line breaks in multiline content', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(/\.multiline-text\s*\{[^}]*white-space:\s*pre-wrap;/);
  });

  it('uses one shared color for every wear-based maintenance indicator', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(/--maintenance-wear-based-color:\s*var\(--bs-purple\);/);
    expect(styles).toMatch(
      /--maintenance-wear-based-background:\s*color-mix\(\s*in srgb,\s*var\(--maintenance-wear-based-color\) 15%,\s*#fff\s*\);/,
    );
    expect(styles).toMatch(
      /\.metric-card\.maintenance-wear-based\s*\{[^}]*border-left-color:\s*var\(--maintenance-wear-based-color\);/,
    );
    expect(styles).toMatch(
      /\.status-badge\.maintenance-wear-based\s*\{[^}]*background:\s*var\(--maintenance-wear-based-background\);[^}]*color:\s*var\(--maintenance-wear-based-color\);/,
    );
    expect(styles).toMatch(
      /\.maintenance-order-plan-wear-based\s*\{[^}]*color:\s*var\(--maintenance-wear-based-color\);/,
    );
  });
});
