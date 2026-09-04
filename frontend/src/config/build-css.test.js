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
    expect(purgeCssOptions.safelist.greedy[0].test('.react-flow__node.selectable')).toBe(true);
    expect(purgeCssOptions.safelist.greedy[1].test('.status-badge.history-action-danger')).toBe(
      true,
    );
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

  it('lays out stock summary cards with the responsive flex alignment', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(
      /\.stock-summary-grid\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*justify-content:\s*space-evenly;[^}]*align-items:\s*center;[^}]*align-content:\s*space-between;/,
    );
    expect(styles).toMatch(
      /\.stock-summary-card\s*\{[^}]*display:\s*flex;[^}]*flex:\s*0 1 10rem;[^}]*flex-direction:\s*column;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*min-width:\s*10rem;[^}]*min-height:\s*4\.5rem;/,
    );
  });

  it('derives every status badge color from theme variables', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
    const badgeRuleBodies = [...styles.matchAll(/\.status-badge[^{]*\{([^}]*)\}/g)].map(
      (match) => match[1],
    );

    expect(styles).toMatch(
      /--status-badge-success-background:\s*color-mix\(\s*in srgb,\s*var\(--brand-leaf\) 15%,\s*var\(--bs-body-bg\)\s*\);/,
    );
    expect(styles).toMatch(
      /\.status-badge\s*\{[^}]*background:\s*var\(--status-badge-background\);[^}]*color:\s*var\(--status-badge-color\);/,
    );
    expect(styles).toMatch(
      /\.status-badge\.stock-minimum\s*\{[^}]*--status-badge-color:\s*var\(--status-badge-minimum-color\);[^}]*--status-badge-background:\s*var\(--status-badge-minimum-background\);/,
    );
    expect(badgeRuleBodies.length).toBeGreaterThan(1);
    for (const ruleBody of badgeRuleBodies) {
      expect(ruleBody).not.toMatch(/#[\da-f]{3,8}|rgba?\(/i);
    }
  });

  it('can display autocomplete suggestions above fields near a modal footer', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(
      /\.autocomplete-options-top\s*\{[^}]*top:\s*auto;[^}]*bottom:\s*calc\(100% \+ 0\.35rem\);/,
    );
  });

  it('keeps quick role permission actions compact, centered and vertically scrollable', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(
      /\.permission-action-panel\s*\{[^}]*height:\s*clamp\(8rem,\s*22vh,\s*11\.25rem\);[^}]*overflow-y:\s*auto;[^}]*scrollbar-gutter:\s*stable;/,
    );
    expect(styles).toMatch(
      /\.permission-action-panel \.permission-action-option\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\) 2rem;[^}]*align-items:\s*center;/,
    );
    const previewRule = styles.match(/\.permission-action-preview\s*\{([^}]*)\}/)?.[1];
    expect(previewRule).not.toMatch(/(?:^|;)\s*height\s*:/);
  });

  it('visually separates dashboard cards from their dedicated background', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(
      /--dashboard-background:\s*color-mix\(\s*in srgb,\s*var\(--brand-mist\) 92%,\s*var\(--brand-forest\) 8%\s*\);/,
    );
    expect(styles).toMatch(
      /\.app-content:has\(> \.dashboard-page\)[^{]*\{[^}]*background:\s*var\(--dashboard-background\);/,
    );
    expect(styles).toMatch(
      /\.metric-card\s*\{[^}]*box-shadow:\s*0 0\.35rem 1rem rgba\(21,\s*54,\s*37,\s*0\.12\);/,
    );
    expect(styles).toMatch(
      /\.metric-card\s*\{[^}]*--metric-card-accent:\s*var\(--brand-leaf\);[^}]*border-left:\s*4px solid var\(--metric-card-accent\);[^}]*background:\s*color-mix\(\s*in srgb,\s*var\(--metric-card-accent\) 10%,\s*#fff\s*\);/,
    );
  });

  it('uses a horizontal GreenDesk progress treatment for timed action buttons', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(
      /\.timed-progress-button\s*\{[^}]*--timed-progress-color:\s*color-mix\(in srgb,\s*var\(--brand-leaf\) 72%,\s*#fff\);/,
    );
    expect(styles).toMatch(
      /@keyframes timed-progress-button-busy\s*\{[\s\S]*transform:\s*translateX\(0\);[\s\S]*transform:\s*translateX\(138%\);/,
    );
    expect(styles).not.toMatch(/\.timed-progress-button__progress\s*\{[^}]*writing-mode:/);
  });

  it('uses one shared color for every wear-based maintenance indicator', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(
      /--maintenance-wear-based-color:\s*var\(--status-badge-maintenance-color\);/,
    );
    expect(styles).toMatch(
      /--maintenance-wear-based-background:\s*var\(--status-badge-maintenance-background\);/,
    );
    expect(styles).toMatch(
      /\.metric-card\.maintenance-wear-based\s*\{[^}]*--metric-card-accent:\s*var\(--maintenance-wear-based-color\);/,
    );
    expect(styles).toMatch(
      /\.status-badge\.maintenance-wear-based\s*\{[^}]*--status-badge-color:\s*var\(--status-badge-maintenance-color\);[^}]*--status-badge-background:\s*var\(--status-badge-maintenance-background\);/,
    );
    expect(styles).toMatch(
      /\.maintenance-order-list-table \.maintenance-order-plans\s*>\s*ul\s*>\s*li\.maintenance-order-plan-wear-based\s*\{[^}]*color:\s*var\(--maintenance-wear-based-color\)\s*!important;/,
    );
  });

  it('uses one shared critical color for alerts and the logout action', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles.match(/#b64141/g)).toHaveLength(1);
    expect(styles).toMatch(/--critical-color:\s*#b64141;/);
    expect(styles).toMatch(
      /\.metric-card\.maintenance-overdue\s*\{[^}]*--metric-card-accent:\s*var\(--critical-color\);/,
    );
    expect(styles).toMatch(
      /\.metric-card\.maintenance-low-stock\s*\{[^}]*--metric-card-accent:\s*var\(--critical-color\);/,
    );
    expect(styles).toMatch(
      /\.maintenance-history-list > li\.maintenance-history-without-parts\s*\{[^}]*border-left:\s*4px solid var\(--critical-color\);/,
    );
    expect(styles).toMatch(
      /\.btn-outline-critical\s*\{[^}]*--bs-btn-color:\s*var\(--critical-color\);[^}]*--bs-btn-bg:\s*transparent;[^}]*--bs-btn-hover-bg:\s*var\(--critical-color\);/,
    );
  });

  it('centralizes theme colors shared by several interface roles', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
    const sharedColors = [
      ['--surface-highlight-color', '#edf3e9'],
      ['--control-border-color', '#cbd7ce'],
      ['--brand-focus-color', 'rgba(79, 125, 33, 0.16)'],
      ['--relation-company-color', '#236941'],
      ['--sidebar-text-color', '#435149'],
      ['--brand-company-color', '#dbe8d7'],
    ];

    for (const [variable, color] of sharedColors) {
      expect(styles).toContain(`${variable}: ${color};`);
      expect(styles.split(color)).toHaveLength(2);
    }
    expect(styles).toMatch(/--bs-pagination-disabled-border-color:\s*var\(--border\);/);
  });

  it('forces the themed low-stock color over Bootstrap table states', () => {
    const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

    expect(styles).toMatch(
      /\.maintenance-order-list-table \.maintenance-order-plans\s*>\s*ul\s*>\s*li\.maintenance-order-low-stock\s*\{[^}]*color:\s*var\(--status-badge-minimum-color\)\s*!important;/,
    );
  });
});
