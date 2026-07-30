import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import packageMetadata from '../../package.json';
import AppFooter from './AppFooter.jsx';

describe('AppFooter', () => {
  it('displays the copyright owner and the current application version', () => {
    render(<AppFooter />);

    const footer = screen.getByRole('contentinfo');

    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} EI BOURNAZEL Paul`);
    expect(footer).toHaveTextContent(`GreenDesk · version ${packageMetadata.version}`);
  });
});
