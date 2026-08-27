import purgeCss from '@fullhuman/postcss-purgecss';

/** Source files inspected to determine which production selectors are reachable. */
export const purgeCssOptions = Object.freeze({
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: {
    standard: [/^app-loader-/],
    greedy: [/react-flow/],
  },
});

/** Keeps development CSS complete while removing unused selectors from production builds. */
export function createPostCssPlugins(command) {
  return command === 'build' ? [purgeCss(purgeCssOptions)] : [];
}
