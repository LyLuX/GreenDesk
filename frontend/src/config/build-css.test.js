import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

import { createPostCssPlugins, purgeCssOptions } from '../../build/css.js';

const readStyles = () =>
  readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8').replace(
    /@import '\.\/styles\/([^']+)';/g,
    (_statement, file) => readFileSync(join(process.cwd(), 'src', 'styles', file), 'utf8'),
  );

describe('production CSS build', () => {
  it('keeps graph states, theme variables and printable documents after production purging', async () => {
    const result = await postcss(createPostCssPlugins('build')).process(readStyles(), {
      from: undefined,
    });
    for (const selector of [
      '.relation-node-selected',
      '.relation-node-related',
      '.relation-node-dimmed',
      '.react-flow__controls',
      '.maintenance-order-list-printable',
      '.maintenance-sheets-printable',
      '.btn-outline-critical',
    ]) {
      expect(result.css).toContain(selector);
    }
    expect(result.css).toContain('--relation-edge-direct-color:');
    expect(result.css).toContain('--relation-marker-color:');
    expect(result.css).toContain('@media print');
    expect(result.css).toContain('@media (max-width: 575.98px)');
  });

  it('loads theme and domain styles once, with responsive and print overrides last', () => {
    const entry = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
    const imports = [...entry.matchAll(/@import '\.\/styles\/([^']+)';/g)].map((match) => match[1]);
    expect(imports[0]).toBe('theme.css');
    expect(imports.slice(-2)).toEqual(['responsive.css', 'print.css']);
    expect(new Set(imports).size).toBe(imports.length);
    expect([...imports].sort()).toEqual(readdirSync(join(process.cwd(), 'src', 'styles')).sort());
    for (const file of imports.filter((name) => name !== 'theme.css')) {
      const css = readFileSync(join(process.cwd(), 'src', 'styles', file), 'utf8');
      expect(css).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/i);
    }
  });

  it('shares relation colors with edges, markers and the graph background', () => {
    const component = readFileSync(
      join(process.cwd(), 'src', 'pages', 'RelationsPage.jsx'),
      'utf8',
    );
    const styles = readStyles();
    expect(component).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/i);
    for (const role of ['group', 'direct', 'association', 'derived']) {
      expect(component).toContain(`var(--relation-edge-${role}-color)`);
      expect(styles).toContain(`--relation-edge-${role}-color:`);
    }
    expect(component).toContain('defaultMarkerColor="var(--relation-marker-color)"');
    expect(component).toContain('color="var(--relation-grid-color)"');
    expect(styles).toContain('--relation-marker-color: #b1b1b7;');
  });

  it('preserves A4 printing and responsive maintenance layouts', () => {
    const styles = readStyles();
    expect(styles).toMatch(/@media print\s*\{\s*@page\s*\{\s*size: A4 portrait;/);
    expect(styles).toMatch(
      /\.maintenance-sheet-print-page\s*\{[^}]*width: 210mm;[^}]*min-height: 297mm;/,
    );
    expect(styles).toMatch(
      /\.maintenance-order-print-page\s*\{[^}]*width: 210mm;[^}]*height: 297mm;/,
    );
    expect(styles).toContain('@media (max-width: 575.98px)');
    expect(styles).toContain('@media (max-width: 767.98px)');
  });

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
    const styles = readStyles();

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
    const styles = readStyles();

    expect(styles).toMatch(/\.multiline-text\s*\{[^}]*white-space:\s*pre-wrap;/);
  });

  it('lays out stock summary cards with the responsive flex alignment', () => {
    const styles = readStyles();

    expect(styles).toMatch(
      /\.stock-summary-grid\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*justify-content:\s*space-evenly;[^}]*align-items:\s*center;[^}]*align-content:\s*space-between;/,
    );
    expect(styles).toMatch(
      /\.stock-summary-card\s*\{[^}]*display:\s*flex;[^}]*flex:\s*0 1 10rem;[^}]*flex-direction:\s*column;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*min-width:\s*10rem;[^}]*min-height:\s*4\.5rem;/,
    );
  });

  it('derives every status badge color from theme variables', () => {
    const styles = readStyles();
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
    const styles = readStyles();

    expect(styles).toMatch(
      /\.autocomplete-options-top\s*\{[^}]*top:\s*auto;[^}]*bottom:\s*calc\(100% \+ 0\.35rem\);/,
    );
  });

  it('keeps quick role permission actions compact, centered and vertically scrollable', () => {
    const styles = readStyles();

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
    const styles = readStyles();

    expect(styles).toMatch(
      /--dashboard-background:\s*color-mix\(\s*in srgb,\s*var\(--brand-mist\) 92%,\s*var\(--brand-forest\) 8%\s*\);/,
    );
    expect(styles).toMatch(
      /\.app-content:has\(> \.dashboard-page\)[^{]*\{[^}]*background:\s*var\(--dashboard-background\);/,
    );
    expect(styles).toMatch(
      /\.metric-card\s*\{[^}]*box-shadow:\s*0 0\.35rem 1rem var\(--metric-shadow-color\);/,
    );
    expect(styles).toMatch(
      /\.metric-card\s*\{[^}]*--metric-card-accent:\s*var\(--brand-leaf\);[^}]*border-left:\s*4px solid var\(--metric-card-accent\);[^}]*background:\s*color-mix\(\s*in srgb,\s*var\(--metric-card-accent\) 10%,\s*var\(--surface-color\)\s*\);/,
    );
  });

  it('uses a horizontal GreenDesk progress treatment for timed action buttons', () => {
    const styles = readStyles();

    expect(styles).toMatch(
      /\.timed-progress-button\s*\{[^}]*--timed-progress-color:\s*color-mix\(in srgb,\s*var\(--brand-leaf\) 72%,\s*var\(--surface-color\)\);/,
    );
    expect(styles).toMatch(
      /@keyframes timed-progress-button-busy\s*\{[\s\S]*transform:\s*translateX\(0\);[\s\S]*transform:\s*translateX\(138%\);/,
    );
    expect(styles).not.toMatch(/\.timed-progress-button__progress\s*\{[^}]*writing-mode:/);
  });

  it('uses one shared color for every wear-based maintenance indicator', () => {
    const styles = readStyles();

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
    const styles = readStyles();

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
    const styles = readStyles();
    const sharedColors = [
      ['--surface-highlight-color', '#edf3e9'],
      ['--control-border-color', '#cbd7ce'],
      ['--brand-focus-color', 'color-mix(in srgb, var(--brand-leaf) 16%, transparent)'],
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
    const styles = readStyles();

    expect(styles).toMatch(
      /\.maintenance-order-list-table \.maintenance-order-plans\s*>\s*ul\s*>\s*li\.maintenance-order-low-stock\s*\{[^}]*color:\s*var\(--status-badge-minimum-color\)\s*!important;/,
    );
  });
});
