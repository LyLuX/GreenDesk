import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  Position: { Left: 'left', Right: 'right' },
  ReactFlowProvider: ({ children }) => children,
  useReactFlow: () => ({ fitView: vi.fn() }),
  ReactFlow: ({ nodes, edges, onNodeClick }) => (
    <div aria-label="Graphe simulé">
      {nodes.map((node) => (
        <div key={node.id}>
          <button type="button" onClick={(event) => onNodeClick(event, node)}>
            {node.data.label}
          </button>
          {node.data.collapsible ? (
            <button
              type="button"
              aria-label={`${node.data.collapsed ? 'Déplier' : 'Replier'} ${node.data.label}`}
              onClick={() => node.data.onToggle(node.id)}
            >
              Basculer
            </button>
          ) : null}
        </div>
      ))}
      {edges.map((edge) => (
        <span data-testid={`edge-${edge.id}`} data-opacity={edge.style.opacity} key={edge.id} />
      ))}
    </div>
  ),
}));

import RelationsPage, {
  filterCollapsedGraph,
  getCollapsibleNodeIds,
  INACTIVE_EDGE_OPACITY,
} from './RelationsPage.jsx';

const simplifiedGraph = {
  mode: 'simplified',
  company: { uuid: 'company-uuid', name: 'Alpha' },
  nodes: [
    { id: 'company', label: 'Alpha', kind: 'company' },
    { id: 'fleet', label: 'Gestion du parc', kind: 'domain' },
    { id: 'categories', label: 'Catégories', kind: 'domain', count: 1 },
    { id: 'category:parks', label: 'Espaces verts', kind: 'entity' },
    { id: 'manufacturers', label: 'Fabricants', kind: 'domain', count: 1 },
    { id: 'manufacturer:husqvarna', label: 'Husqvarna', kind: 'entity' },
    { id: 'suppliers', label: 'Fournisseurs', kind: 'domain', count: 1 },
    { id: 'supplier:parts-pro', label: 'Pièces Pro', kind: 'entity' },
    { id: 'materials', label: 'Matériels', kind: 'entity', count: 3 },
  ],
  edges: [
    {
      id: 'company-fleet',
      source: 'company',
      target: 'fleet',
      label: 'contient',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'fleet-categories',
      source: 'fleet',
      target: 'categories',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'categories-parks',
      source: 'categories',
      target: 'category:parks',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'fleet-manufacturers',
      source: 'fleet',
      target: 'manufacturers',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'manufacturers-husqvarna',
      source: 'manufacturers',
      target: 'manufacturer:husqvarna',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'fleet-suppliers',
      source: 'fleet',
      target: 'suppliers',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'suppliers-parts-pro',
      source: 'suppliers',
      target: 'supplier:parts-pro',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'fleet-materials',
      source: 'fleet',
      target: 'materials',
      label: 'fabrique',
      kind: 'group',
      hierarchy: true,
    },
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
  afterEach(cleanup);

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

    expect(await screen.findByRole('button', { name: 'Gestion du parc' })).toBeVisible();
    expect(mocks.getRelationsGraph).toHaveBeenCalledWith('simplified', 'records');
    expect(screen.queryByRole('button', { name: 'Matériels' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fichiers des matériels' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Déplier Gestion du parc' }));
    expect(await screen.findByRole('button', { name: 'Matériels' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Vue complète' }));

    await waitFor(() =>
      expect(mocks.getRelationsGraph).toHaveBeenCalledWith('complete', 'records'),
    );
    expect(screen.queryByRole('button', { name: 'Matériels' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Déplier Gestion du parc' }));
    await user.click(await screen.findByRole('button', { name: 'Déplier Matériels' }));
    expect(await screen.findByRole('button', { name: 'Fichiers des matériels' })).toBeVisible();
    expect(screen.queryByText(/Utilisez la molette/i)).not.toBeInTheDocument();
  });

  it('starts with every branch collapsed and opens fleet directories independently', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Gestion du parc' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Catégories' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Déplier Gestion du parc' }));

    expect(await screen.findByRole('button', { name: 'Catégories' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fabricants' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fournisseurs' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Espaces verts' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Husqvarna' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Déplier Catégories' }));

    expect(await screen.findByRole('button', { name: 'Espaces verts' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Husqvarna' })).toBeNull();
  });

  it('makes non-active relation edges more discreet', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Déplier Gestion du parc' }));
    await user.click(screen.getByRole('button', { name: 'Matériels' }));

    expect(screen.getByTestId('edge-fleet-materials')).toHaveAttribute('data-opacity', '1');
    expect(screen.getByTestId('edge-fleet-categories')).toHaveAttribute(
      'data-opacity',
      String(INACTIVE_EDGE_OPACITY),
    );
  });

  it('removes the descendants of a collapsed hierarchy branch', () => {
    const filtered = filterCollapsedGraph(simplifiedGraph, new Set(['fleet']));

    expect(filtered.nodes.map(({ id }) => id)).toEqual(['company', 'fleet']);
    expect(filtered.edges.map(({ id }) => id)).toEqual(['company-fleet']);
  });

  it('identifies every collapsible hierarchy branch except the company root', () => {
    expect([...getCollapsibleNodeIds(simplifiedGraph)]).toEqual(
      expect.arrayContaining(['fleet', 'categories', 'manufacturers', 'suppliers']),
    );
    expect(getCollapsibleNodeIds(simplifiedGraph)).not.toContain('company');
  });
});
