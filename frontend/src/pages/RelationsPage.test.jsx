import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRelationsGraph: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('../api/relations.api.js', () => ({
  getRelationsGraph: mocks.getRelationsGraph,
}));
vi.mock('../auth/useAuth.js', () => ({
  default: mocks.useAuth,
}));
vi.mock('@xyflow/react', () => ({
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: 'arrow-closed' },
  MiniMap: () => null,
  Position: { Left: 'left', Right: 'right' },
  ReactFlowProvider: ({ children }) => children,
  useReactFlow: () => ({ fitView: vi.fn() }),
  ReactFlow: ({ nodes, onNodeClick }) => (
    <div aria-label="Graphe simulé">
      {nodes.map((node) => (
        <button type="button" key={node.id} onClick={(event) => onNodeClick(event, node)}>
          {node.data.label}
        </button>
      ))}
    </div>
  ),
}));

import RelationsPage, { filterCollapsedGraph } from './RelationsPage.jsx';

const simplifiedGraph = {
  mode: 'simplified',
  company: { uuid: 'company-uuid', name: 'Alpha' },
  nodes: [
    { id: 'company', label: 'Alpha', kind: 'company' },
    { id: 'fleet', label: 'Gestion du parc', kind: 'domain' },
    { id: 'materials', label: 'Matériels', kind: 'entity', count: 3 },
  ],
  edges: [
    { id: 'company-fleet', source: 'company', target: 'fleet', kind: 'group', hierarchy: true },
    { id: 'fleet-materials', source: 'fleet', target: 'materials', kind: 'group', hierarchy: true },
  ],
};

const completeGraph = {
  ...simplifiedGraph,
  mode: 'complete',
  nodes: [
    ...simplifiedGraph.nodes,
    { id: 'materialFiles', label: 'Fichiers des matériels', kind: 'technical', count: 5 },
  ],
  edges: [
    ...simplifiedGraph.edges,
    {
      id: 'materials-materialFiles',
      source: 'materials',
      target: 'materialFiles',
      kind: 'direct',
      hierarchy: true,
    },
  ],
};

describe('RelationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ activeCompany: { uuid: 'company-uuid', name: 'Alpha' } });
    mocks.getRelationsGraph.mockImplementation((mode) =>
      Promise.resolve({ data: { data: mode === 'complete' ? completeGraph : simplifiedGraph } }),
    );
  });

  it('loads the simplified graph then requests the complete mode', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Matériels' })).toBeVisible();
    expect(mocks.getRelationsGraph).toHaveBeenCalledWith('simplified');
    expect(screen.queryByRole('button', { name: 'Fichiers des matériels' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Vue complète' }));

    expect(await screen.findByRole('button', { name: 'Fichiers des matériels' })).toBeVisible();
    await waitFor(() => expect(mocks.getRelationsGraph).toHaveBeenCalledWith('complete'));
  });

  it('removes the descendants of a collapsed hierarchy branch', () => {
    const filtered = filterCollapsedGraph(simplifiedGraph, new Set(['fleet']));

    expect(filtered.nodes.map(({ id }) => id)).toEqual(['company', 'fleet']);
    expect(filtered.edges.map(({ id }) => id)).toEqual(['company-fleet']);
  });
});
