import { cleanup, render, screen, within } from '@testing-library/react';
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
        <span data-testid={`edge-${edge.id}`} data-opacity={edge.style.opacity} key={edge.id}>
          {edge.label}
        </span>
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

  it('explores shared parts and real consumption without filters or search', async () => {
    const user = userEvent.setup();
    mocks.getRelationsGraph.mockResolvedValue({
      data: {
        data: {
          scope: 'materialParts',
          mode: 'simplified',
          company: { uuid: 'company-uuid', name: 'Alpha' },
          nodes: [
            { id: 'company', label: 'Alpha', kind: 'company' },
            {
              id: 'material:mower',
              label: 'Tondeuse',
              kind: 'entity',
              recordType: 'material',
              path: '/materials/mower',
              plansPath: '/maintenance?materialUuid=mower',
            },
            {
              id: 'material:tractor',
              label: 'Tracteur',
              kind: 'entity',
              recordType: 'material',
              path: '/materials/tractor',
            },
            {
              id: 'part:oil',
              label: 'Huile',
              description: 'Réf. H1',
              kind: 'entity',
              recordType: 'part',
            },
          ],
          edges: [
            {
              id: 'root-mower',
              source: 'company',
              target: 'material:mower',
              kind: 'group',
              label: '',
              hierarchy: true,
            },
            {
              id: 'root-tractor',
              source: 'company',
              target: 'material:tractor',
              kind: 'group',
              label: '',
              hierarchy: true,
            },
            {
              id: 'mower-oil',
              source: 'material:mower',
              target: 'part:oil',
              kind: 'association',
              label: 'Prévue et consommée',
              hierarchy: true,
              planned: true,
              consumptions: [{ quantity: 1.75, unit: 'litre', lastUsedAt: '2026-09-09' }],
            },
            {
              id: 'tractor-oil',
              source: 'material:tractor',
              target: 'part:oil',
              kind: 'derived',
              label: 'Prévue',
              hierarchy: true,
              planned: true,
              consumptions: [],
            },
          ],
        },
      },
    });
    render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('button', { name: 'Tondeuse', exact: true })).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Huile', exact: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tondeuse', exact: true }));
    const details = screen.getByRole('region', { name: 'Détails des relations' });
    expect(within(details).getByText('Prévue et consommée')).toBeVisible();
    expect(within(details).getByText(/1,75 litre/)).toHaveTextContent('09/09/2026');
    expect(
      within(details).getByRole('link', { name: 'Voir les plans du matériel' }),
    ).toHaveAttribute('href', '/maintenance?materialUuid=mower');
    await user.click(within(details).getByRole('button', { name: 'Huile' }));
    expect(within(details).getByRole('button', { name: 'Tondeuse' })).toBeVisible();
    expect(within(details).getByRole('button', { name: 'Tracteur' })).toBeVisible();
    expect(screen.getByTestId('edge-tractor-oil')).toHaveAttribute('data-opacity', '1');
    expect(
      within(screen.getByLabelText('Graphe simulé')).getAllByRole('button', {
        name: 'Huile',
        exact: true,
      }),
    ).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Replier les branches' }));
    expect(screen.queryByRole('region', { name: 'Détails des relations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Huile', exact: true })).not.toBeInTheDocument();
  });

  it('explains when there are no readable materials', async () => {
    mocks.getRelationsGraph.mockResolvedValue({
      data: { data: { nodes: [{ id: 'company', label: 'Alpha', kind: 'company' }], edges: [] } },
    });
    render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('Aucun matériel consultable dans cette société.'),
    ).toHaveAttribute('role', 'status');
  });

  it('loads one complete graph without a mode selector', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Gestion du parc' })).toBeVisible();
    expect(mocks.getRelationsGraph).toHaveBeenCalledWith('simplified', 'materialParts');
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
