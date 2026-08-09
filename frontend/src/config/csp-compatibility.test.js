import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = join(process.cwd(), 'src');

describe('frontend CSP compatibility', () => {
  it('keeps application code independent from inline style permissions', () => {
    const violations = readdirSync(sourceRoot, { recursive: true })
      .filter(
        (relativePath) =>
          /\.(?:js|jsx)$/.test(relativePath) && !/\.test\.(?:js|jsx)$/.test(relativePath),
      )
      .flatMap((relativePath) => {
        const source = readFileSync(join(sourceRoot, relativePath), 'utf8');
        return /\bstyle\s*=|\.style(?:\.|\[)/.test(source) ? [relativePath] : [];
      });

    expect(violations).toEqual([]);
  });
});
