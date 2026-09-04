import { cleanup, render, screen } from '@testing-library/react';
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
    { id: 'materials', label: 'Matériels', kind: 'domain', count: 1 },
    { id: 'material:mower', label: 'Tondeuse', kind: 'entity' },
    { id: 'maintenance', label: 'Maintenance', kind: 'domain' },
    { id: 'plans', label: 'Plans de maintenance', kind: 'domain', count: 1 },
    { id: 'plan:mower', label: 'Entretien de la tondeuse', kind: 'entity' },
    { id: 'operations', label: 'Opérations', kind: 'domain', count: 1 },
    { id: 'operation:oil', label: 'Vidange', kind: 'entity' },
    { id: 'parts', label: 'Pièces', kind: 'domain', count: 1 },
    { id: 'part:filter', label: 'Filtre', kind: 'entity' },
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
    {
      id: 'materials-mower',
      source: 'materials',
      target: 'material:mower',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'parks-mower',
      source: 'category:parks',
      target: 'material:mower',
      kind: 'direct',
      hierarchy: true,
      layout: true,
    },
    {
      id: 'husqvarna-mower',
      source: 'manufacturer:husqvarna',
      target: 'material:mower',
      kind: 'direct',
      hierarchy: true,
      layout: true,
    },
    {
      id: 'company-maintenance',
      source: 'company',
      target: 'maintenance',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'maintenance-plans',
      source: 'maintenance',
      target: 'plans',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'plans-mower',
      source: 'plans',
      target: 'plan:mower',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'maintenance-operations',
      source: 'maintenance',
      target: 'operations',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'operations-oil',
      source: 'operations',
      target: 'operation:oil',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'oil-plan',
      source: 'operation:oil',
      target: 'plan:mower',
      kind: 'direct',
      hierarchy: true,
      layout: true,
    },
    {
      id: 'maintenance-parts',
      source: 'maintenance',
      target: 'parts',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'parts-filter',
      source: 'parts',
      target: 'part:filter',
      kind: 'group',
      hierarchy: true,
    },
    {
      id: 'plan-filter',
      source: 'plan:mower',
      target: 'part:filter',
      kind: 'association',
      hierarchy: true,
      layout: true,
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
      id: 'mower-materialFiles',
      source: 'material:mower',
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
    mocks.getRelationsGraph.mockResolvedValue({ data: { data: completeGraph } });
  });

  it('loads one complete graph without a mode selector', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Gestion du parc' })).toBeVisible();
    expect(mocks.getRelationsGraph).toHaveBeenCalledWith('complete', 'records');
    expect(screen.queryByRole('button', { name: 'Vue simplifiée' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Vue complète' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Matériels' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fichiers des matériels' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Déplier Gestion du parc' }));
    expect(await screen.findByRole('button', { name: 'Matériels' })).toBeVisible();
    await user.click(await screen.findByRole('button', { name: 'Déplier Matériels' }));
    await user.click(await screen.findByRole('button', { name: 'Déplier Tondeuse' }));
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
    expect(screen.getByRole('button', { name: 'Matériels' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fabricants' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fournisseurs' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tondeuse' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Espaces verts' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Husqvarna' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Déplier Catégories' }));

    expect(await screen.findByRole('button', { name: 'Espaces verts' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Husqvarna' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Déplier Espaces verts' }));

    expect(await screen.findByRole('button', { name: 'Tondeuse' })).toBeVisible();
  });

  it('opens maintenance groups before their records and relations', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Déplier Maintenance' }));

    expect(screen.getByRole('button', { name: 'Plans de maintenance' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Opérations' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pièces' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Vidange' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Déplier Opérations' }));
    await user.click(await screen.findByRole('button', { name: 'Déplier Vidange' }));

    expect(await screen.findByRole('button', { name: 'Entretien de la tondeuse' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Filtre' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Déplier Entretien de la tondeuse' }));

    expect(await screen.findByRole('button', { name: 'Filtre' })).toBeVisible();
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

  it('removes the descendants of collapsed hierarchy branches', () => {
    const filtered = filterCollapsedGraph(simplifiedGraph, new Set(['fleet', 'maintenance']));

    expect(filtered.nodes.map(({ id }) => id)).toEqual(['company', 'fleet', 'maintenance']);
    expect(filtered.edges.map(({ id }) => id)).toEqual(['company-fleet', 'company-maintenance']);
  });

  it('identifies every collapsible hierarchy branch except the company root', () => {
    expect([...getCollapsibleNodeIds(simplifiedGraph)]).toEqual(
      expect.arrayContaining([
        'fleet',
        'materials',
        'categories',
        'category:parks',
        'manufacturers',
        'manufacturer:husqvarna',
        'suppliers',
        'maintenance',
        'plans',
        'plan:mower',
        'operations',
        'operation:oil',
        'parts',
      ]),
    );
    expect(getCollapsibleNodeIds(simplifiedGraph)).not.toContain('company');
  });
});
