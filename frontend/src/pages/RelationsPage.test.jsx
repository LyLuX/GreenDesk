import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRelationsGraph: vi.fn(),
  useAuth: vi.fn(),
  fitView: vi.fn(),
  getCompanyLogo: vi.fn(),
}));
vi.mock('../api/company-logo.api.js', () => ({ getCompanyLogo: mocks.getCompanyLogo }));
vi.mock('../api/relations.api.js', () => ({ getRelationsGraph: mocks.getRelationsGraph }));
vi.mock('../auth/useAuth.js', () => ({ default: mocks.useAuth }));
vi.mock('@xyflow/react', () => ({
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: 'arrow-closed' },
  Position: { Left: 'left', Right: 'right' },
  ReactFlowProvider: ({ children }) => children,
  useReactFlow: () => ({ fitView: mocks.fitView }),
  ReactFlow: ({ nodes, edges, nodeTypes, onNodeClick }) => {
    const Node = nodeTypes.relation;
    return (
      <div aria-label="Graphe simulé">
        {nodes.map((node) => (
          <div key={node.id}>
            <button type="button" onClick={(event) => onNodeClick(event, node)}>
              {node.data.label}
            </button>
            <Node data={node.data} />
          </div>
        ))}
        {edges.map((edge) => (
          <span data-testid={`edge-${edge.id}`} data-opacity={edge.style.opacity} key={edge.id}>
            {edge.label}
          </span>
        ))}
      </div>
    );
  },
}));

import RelationsPage, {
  filterCollapsedGraph,
  getCollapsibleNodeIds,
  getFocusNodeIds,
} from './RelationsPage.jsx';

const groupEdge = (source, target) => ({
  id: `${source}-${target}`,
  source,
  target,
  kind: 'group',
  label: '',
  hierarchy: true,
});
const graph = {
  scope: 'materialParts',
  mode: 'simplified',
  company: { uuid: 'company-uuid', name: 'Alpha' },
  nodes: [
    { id: 'company', label: 'Alpha', kind: 'company', materialCount: 2, partCount: 1 },
    { id: 'category:garden', label: 'Jardin', kind: 'domain', count: 1 },
    { id: 'category:park', label: 'Parc', kind: 'domain', count: 1 },
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
    { id: 'part:oil', label: 'Huile', description: 'Réf. H1', kind: 'entity', recordType: 'part' },
  ],
  edges: [
    groupEdge('company', 'category:garden'),
    groupEdge('company', 'category:park'),
    groupEdge('category:garden', 'material:mower'),
    groupEdge('category:park', 'material:tractor'),
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
};
const renderPage = () =>
  render(
    <MemoryRouter>
      <RelationsPage />
    </MemoryRouter>,
  );
const openMower = async (user) => {
  await user.click(await screen.findByRole('button', { name: 'Déplier Alpha' }));
  await user.click(screen.getByRole('button', { name: 'Déplier Jardin' }));
  await user.click(screen.getByRole('button', { name: 'Tondeuse', exact: true }));
};

describe('RelationsPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ activeCompany: { uuid: 'company-uuid', name: 'Alpha' } });
    mocks.getRelationsGraph.mockResolvedValue({ data: { data: graph } });
  });

  it('reloads the graph when the active company changes', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: 'Déplier Alpha' });
    expect(mocks.getRelationsGraph).toHaveBeenCalledTimes(1);
    mocks.useAuth.mockReturnValue({ activeCompany: { uuid: 'another-company', name: 'Beta' } });
    rerender(
      <MemoryRouter>
        <RelationsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mocks.getRelationsGraph).toHaveBeenCalledTimes(2));
  });

  it('starts with only the company, its counts and a keyboard-accessible plus', async () => {
    const user = userEvent.setup();
    renderPage();
    const toggle = await screen.findByRole('button', { name: 'Déplier Alpha' });
    expect(toggle).toHaveTextContent('+');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('2 matériels concernés')).toBeVisible();
    expect(screen.getByText('1 référence de pièce')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Logo GreenDesk' })).toHaveAttribute(
      'src',
      '/logo-greendesk.jpg',
    );
    expect(mocks.getCompanyLogo).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Jardin', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(mocks.getRelationsGraph).toHaveBeenCalledWith('simplified', 'materialParts');
    toggle.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Replier Alpha' })).toHaveTextContent('−');
    expect(screen.getByRole('button', { name: 'Jardin', exact: true })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tondeuse', exact: true })).not.toBeInTheDocument();
  });

  it('uses the active company logo in its collapsed tile and falls back if unavailable', async () => {
    mocks.useAuth.mockReturnValue({
      activeCompany: { uuid: 'company-uuid', name: 'Alpha', hasLogo: true },
    });
    mocks.getCompanyLogo.mockRejectedValue(new Error('Logo unavailable'));
    renderPage();
    expect(await screen.findByRole('img', { name: 'Logo GreenDesk' })).toHaveAttribute(
      'src',
      '/logo-greendesk.jpg',
    );
    expect(mocks.getCompanyLogo).toHaveBeenCalledWith('company-uuid');
    expect(screen.getByRole('button', { name: 'Déplier Alpha' })).toBeVisible();
  });

  it('frames only the selected material and its visible parts, never the whole graph', async () => {
    const user = userEvent.setup();
    renderPage();
    await openMower(user);
    expect(
      within(screen.getByLabelText('Graphe simulé')).getByRole('button', {
        name: 'Huile',
        exact: true,
      }),
    ).toBeVisible();
    await waitFor(() =>
      expect(mocks.fitView).toHaveBeenLastCalledWith(
        expect.objectContaining({
          nodes: [{ id: 'material:mower' }, { id: 'part:oil' }],
          maxZoom: 1.2,
        }),
      ),
    );
    const details = screen.getByRole('region', { name: 'Détails des relations' });
    expect(within(details).getByText(/1,75 litre/)).toHaveTextContent('09/09/2026');
    expect(
      within(details).getByRole('link', { name: 'Voir les plans du matériel' }),
    ).toHaveAttribute('href', '/maintenance?materialUuid=mower');
  });

  it('opens the categories of every material sharing a selected part without duplicating it', async () => {
    const user = userEvent.setup();
    renderPage();
    await openMower(user);
    const details = screen.getByRole('region', { name: 'Détails des relations' });
    await user.click(within(details).getByRole('button', { name: 'Huile' }));
    expect(screen.getByRole('button', { name: 'Replier Parc' })).toBeVisible();
    expect(within(details).getByRole('button', { name: 'Tondeuse' })).toBeVisible();
    expect(within(details).getByRole('button', { name: 'Tracteur' })).toBeVisible();
    expect(screen.getByTestId('edge-tractor-oil')).toHaveAttribute('data-opacity', '1');
    expect(
      within(screen.getByLabelText('Graphe simulé')).getAllByRole('button', {
        name: 'Huile',
        exact: true,
      }),
    ).toHaveLength(1);
    await waitFor(() =>
      expect(mocks.fitView).toHaveBeenLastCalledWith(
        expect.objectContaining({
          nodes: [{ id: 'part:oil' }, { id: 'material:mower' }, { id: 'material:tractor' }],
        }),
      ),
    );
  });

  it('returns to the collapsed company from both the toolbar and its minus button', async () => {
    const user = userEvent.setup();
    renderPage();
    await openMower(user);
    await user.click(screen.getByRole('button', { name: 'Replier Alpha' }));
    expect(screen.queryByRole('button', { name: 'Tondeuse', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Détails des relations' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.fitView).toHaveBeenLastCalledWith(
        expect.objectContaining({ nodes: [{ id: 'company' }] }),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Tout déplier' }));
    expect(screen.getByRole('button', { name: 'Tondeuse', exact: true })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Replier les branches' }));
    expect(screen.getByRole('button', { name: 'Déplier Alpha' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Jardin', exact: true })).not.toBeInTheDocument();
  });

  it('explains an empty graph without inventing expandable branches', async () => {
    mocks.getRelationsGraph.mockResolvedValue({
      data: {
        data: {
          ...graph,
          nodes: [{ ...graph.nodes[0], materialCount: 0, partCount: 0 }],
          edges: [],
        },
      },
    });
    renderPage();
    expect(
      await screen.findByText(
        'Aucun matériel avec une pièce prévue ou consommée consultable dans cette société.',
      ),
    ).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: 'Déplier Alpha' })).not.toBeInTheDocument();
  });

  it('includes the company in collapsed branches and retains shared pieces reachable elsewhere', () => {
    const allCollapsed = getCollapsibleNodeIds(graph);
    expect(allCollapsed).toContain('company');
    expect(filterCollapsedGraph(graph, allCollapsed).nodes.map(({ id }) => id)).toEqual([
      'company',
    ]);
    const partial = filterCollapsedGraph(graph, new Set(['category:park']));
    expect(partial.nodes.map(({ id }) => id)).toContain('part:oil');
    expect(partial.edges.some(({ id }) => id === 'tractor-oil')).toBe(false);
  });

  it('does not include ancestors or unrelated nodes in material framing', () => {
    const nodes = graph.nodes.map((node) => ({ ...node, data: node }));
    expect(getFocusNodeIds(nodes, graph.edges, 'material:mower')).toEqual([
      'material:mower',
      'part:oil',
    ]);
    expect(getFocusNodeIds(nodes, graph.edges, 'missing')).toEqual(['company']);
  });
});
