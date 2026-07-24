import { describe, expect, it } from 'vitest';

import { getModuleTitle } from './App.jsx';

describe('getModuleTitle', () => {
  it('returns the current module title for application routes', () => {
    expect(getModuleTitle('/dashboard')).toBe('Tableau de bord');
    expect(getModuleTitle('/materials')).toBe('Matériels');
    expect(getModuleTitle('/materials/4f3f40f6-5ad8-4b61-a88b-01c9e0ce95f5/edit')).toBe(
      'Matériels',
    );
  });

  it('falls back to the not-found title for unknown routes', () => {
    expect(getModuleTitle('/inconnu')).toBe('Page introuvable');
  });
});
