import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dagre from '@dagrejs/dagre';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { getRelationsGraph } from '../api/relations.api.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';
import Loader from '../components/Loader.jsx';
import CompanyLogo from '../components/CompanyLogo.jsx';
import StatusPanel from '../components/StatusPanel.jsx';
import { formatStockQuantity } from '../inventory/stock-status.js';
import { formatDate } from '../utils/formatters.js';

const NODE_WIDTH = 230;
const NODE_HEIGHT = 124;
const edgeStyles = Object.freeze({
  group: { stroke: 'var(--relation-edge-group-color)', strokeWidth: 1.5 },
  direct: { stroke: 'var(--relation-edge-direct-color)', strokeWidth: 2 },
  association: { stroke: 'var(--relation-edge-association-color)', strokeWidth: 2 },
  derived: {
    stroke: 'var(--relation-edge-derived-color)',
    strokeWidth: 2,
    strokeDasharray: '7 5',
  },
});
export const INACTIVE_EDGE_OPACITY = 0.1;

/** Includes the company so the initial view can show only its collapsed tile. */
export const getCollapsibleNodeIds = (graph) =>
  new Set(graph.edges.filter(({ hierarchy }) => hierarchy).map(({ source }) => source));

/** Frames a selected material and its parts, or the visible descendants of a group. */
export const getFocusNodeIds = (nodes, edges, focusId) => {
  const focused = nodes.find(({ id }) => id === focusId);
  if (!focused) return ['company'];
  const ids = new Set([focusId]);
  if (focused.data?.recordType === 'part') {
    for (const edge of edges) if (edge.target === focusId) ids.add(edge.source);
  } else {
    const pending = [focusId];
    while (pending.length) {
      const source = pending.pop();
      for (const edge of edges) {
        if (edge.source !== source || ids.has(edge.target)) continue;
        ids.add(edge.target);
        pending.push(edge.target);
      }
    }
  }
  return [...ids];
};

/** Hides descendants whose hierarchy branch has been collapsed. */
export const filterCollapsedGraph = (graph, collapsedIds) => {
  const visibleIds = new Set(['company']);
  const hierarchyEdges = graph.edges.filter(({ hierarchy }) => hierarchy);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { source, target } of hierarchyEdges) {
      if (!visibleIds.has(source) || collapsedIds.has(source) || visibleIds.has(target)) continue;
      visibleIds.add(target);
      changed = true;
    }
  }
  return {
    nodes: graph.nodes.filter(({ id }) => visibleIds.has(id)),
    edges: graph.edges.filter(
      ({ source, target, hierarchy }) =>
        visibleIds.has(source) &&
        visibleIds.has(target) &&
        !(hierarchy && collapsedIds.has(source)),
    ),
  };
};

/** Computes stable left-to-right positions for the currently visible graph. */
export const layoutRelationGraph = (nodes, edges) => {
  const layout = new dagre.graphlib.Graph();
  layout.setDefaultEdgeLabel(() => ({}));
  layout.setGraph({ rankdir: 'LR', ranksep: 190, nodesep: 46, marginx: 28, marginy: 28 });
  nodes.forEach(({ id }) => layout.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges
    .filter(({ hierarchy, layout: affectsLayout }) => hierarchy || affectsLayout)
    .forEach(({ source, target }) => layout.setEdge(source, target));
  dagre.layout(layout);
  return nodes.map((item) => {
    const position = layout.node(item.id);
    return {
      ...item,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });
};

function RelationNode({ data }) {
  return (
    <article
      className={`relation-node relation-node-${data.kind} ${data.highlightClass ?? ''}`}
      aria-label={`${data.label}${Number.isInteger(data.count) ? `, ${data.count} enregistrement(s)` : ''}`}
    >
      <Handle type="target" position={Position.Left} className="relation-node-handle" />
      <div className="relation-node-heading">
        {data.id === 'company' ? (
          <CompanyLogo company={data.company} className="brand-thumbnail flex-shrink-0" />
        ) : null}
        <strong title={data.label}>{data.label}</strong>
        {data.collapsible ? (
          <button
            type="button"
            className="relation-node-toggle nodrag nopan"
            aria-label={`${data.collapsed ? 'Déplier' : 'Replier'} ${data.label}`}
            aria-expanded={!data.collapsed}
            onClick={(event) => {
              event.stopPropagation();
              data.onToggle(data.id);
            }}
          >
            {data.collapsed ? '+' : '−'}
          </button>
        ) : null}
      </div>
      {Number.isInteger(data.materialCount) ? (
        <div className="relation-node-count">
          <div>
            {data.materialCount.toLocaleString('fr-FR')} matériel{data.materialCount > 1 ? 's' : ''}{' '}
            concerné{data.materialCount > 1 ? 's' : ''}
          </div>
          <div>
            {data.partCount.toLocaleString('fr-FR')} référence{data.partCount > 1 ? 's' : ''} de
            pièce{data.partCount > 1 ? 's' : ''}
          </div>
        </div>
      ) : Number.isInteger(data.count) ? (
        <span className="relation-node-count">
          {data.count.toLocaleString('fr-FR')} enregistrement{data.count === 1 ? '' : 's'}
        </span>
      ) : (
        <span className="relation-node-description" title={data.description}>
          {data.description}
        </span>
      )}
      {data.path ? (
        <button
          type="button"
          className="relation-node-link nodrag nopan"
          onClick={(event) => {
            event.stopPropagation();
            data.onOpen(data.path);
          }}
        >
          Ouvrir la page
        </button>
      ) : null}
      <Handle type="source" position={Position.Right} className="relation-node-handle" />
    </article>
  );
}

const nodeTypes = { relation: RelationNode };

function RelationDetails({ graph, selectedId, onSelect }) {
  const selected = graph?.nodes.find(({ id }) => id === selectedId);
  if (!['material', 'part'].includes(selected?.recordType)) return null;
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const relations = graph.edges.filter(
    (edge) =>
      Array.isArray(edge.consumptions) &&
      (edge.source === selectedId || edge.target === selectedId),
  );
  return (
    <section className="relations-details" aria-label="Détails des relations">
      <h2 className="h5">{selected.label}</h2>
      <p className="text-muted mb-2">{selected.description}</p>
      {!relations.length ? (
        <p className="mb-0">Aucune pièce prévue ou consommée consultable pour ce matériel.</p>
      ) : (
        <ul className="list-group list-group-flush relations-details-list">
          {relations.map((relation) => {
            const other = nodesById.get(
              relation.source === selectedId ? relation.target : relation.source,
            );
            const material = nodesById.get(relation.source);
            return (
              <li className="list-group-item px-0" key={relation.id}>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-start"
                    onClick={() => onSelect(other.id)}
                  >
                    {other.label}
                  </button>
                  <span
                    className={`badge ${relation.consumptions.length ? 'text-bg-primary' : 'text-bg-secondary'}`}
                  >
                    {relation.label}
                  </span>
                </div>
                <p className="small text-muted mb-1">{other.description}</p>
                {relation.consumptions.map((consumption) => (
                  <p className="small mb-1" key={consumption.unit}>
                    Consommation totale :{' '}
                    {formatStockQuantity(consumption.quantity, consumption.unit)} · Dernière
                    utilisation : {formatDate(consumption.lastUsedAt)}
                  </p>
                ))}
                <div className="d-flex flex-wrap gap-3 small">
                  {relation.planned && material.plansPath ? (
                    <Link to={material.plansPath}>Voir les plans du matériel</Link>
                  ) : null}
                  {relation.consumptions.length > 0 && material.path ? (
                    <Link to={material.path}>Ouvrir la fiche du matériel</Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RelationsGraphPage() {
  const navigate = useNavigate();
  const { fitView } = useReactFlow();
  const { activeCompany } = useAuth();
  const [graph, setGraph] = useState(null);
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [focusId, setFocusId] = useState('company');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getRelationsGraph('simplified', 'materialParts');
      const next = response.data?.data;
      if (!next || !Array.isArray(next.nodes) || !Array.isArray(next.edges)) {
        throw new Error('Réponse de cartographie invalide.');
      }
      setGraph(next);
      setCollapsedIds(getCollapsibleNodeIds(next));
      setSelectedId(null);
      setFocusId('company');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.uuid]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleNode = useCallback((id) => {
    setFocusId(id);
    setSelectedId(null);
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectNode = useCallback(
    (id) => {
      setSelectedId(id);
      setFocusId(id);
      setCollapsedIds((current) => {
        const next = new Set(current);
        const ancestors = [id];
        const visited = new Set();
        while (ancestors.length) {
          const target = ancestors.pop();
          if (visited.has(target)) continue;
          visited.add(target);
          next.delete(target);
          for (const edge of graph?.edges ?? []) {
            if (edge.target === target && edge.hierarchy) ancestors.push(edge.source);
          }
        }
        return next;
      });
    },
    [graph],
  );

  const flow = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    const visible = filterCollapsedGraph(graph, collapsedIds);
    const relatedIds = new Set([selectedId]);
    if (selectedId) {
      visible.edges.forEach(({ source, target }) => {
        if (source === selectedId) relatedIds.add(target);
        if (target === selectedId) relatedIds.add(source);
      });
    }
    const hierarchySources = new Set(
      graph.edges.filter(({ hierarchy }) => hierarchy).map(({ source }) => source),
    );
    const layoutedNodes = layoutRelationGraph(visible.nodes, visible.edges).map((item) => ({
      id: item.id,
      type: 'relation',
      position: item.position,
      data: {
        ...item,
        ...(item.id === 'company'
          ? { company: activeCompany?.uuid === graph.company?.uuid ? activeCompany : graph.company }
          : {}),
        collapsible: hierarchySources.has(item.id),
        collapsed: collapsedIds.has(item.id),
        highlightClass:
          selectedId && item.id !== selectedId
            ? relatedIds.has(item.id)
              ? 'relation-node-related'
              : 'relation-node-dimmed'
            : selectedId === item.id
              ? 'relation-node-selected'
              : '',
        onToggle: toggleNode,
        onOpen: navigate,
      },
    }));
    const flowEdges = visible.edges.map((item) => {
      const isRelated = !selectedId || item.source === selectedId || item.target === selectedId;
      return {
        id: item.id,
        source: item.source,
        target: item.target,
        type: 'smoothstep',
        label: item.label,
        labelStyle: { fill: 'var(--relation-node-text-color)', fontSize: 11 },
        labelBgStyle: { fill: 'var(--surface-color)', fillOpacity: 0.95 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: {
          ...edgeStyles[item.kind],
          opacity: isRelated ? 1 : INACTIVE_EDGE_OPACITY,
        },
      };
    });
    return { nodes: layoutedNodes, edges: flowEdges };
  }, [activeCompany, collapsedIds, graph, navigate, selectedId, toggleNode]);

  const collapseBranches = () => {
    setCollapsedIds(graph ? getCollapsibleNodeIds(graph) : new Set());
    setSelectedId(null);
    setFocusId('company');
  };

  useEffect(() => {
    if (loading || !flow.nodes.length) return undefined;
    const frame = window.requestAnimationFrame(() => {
      fitView({
        nodes: getFocusNodeIds(flow.nodes, flow.edges, focusId).map((id) => ({ id })),
        padding: 0.22,
        maxZoom: 1.2,
        duration: 300,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, flow, focusId, loading]);

  return (
    <main className="app-page relations-page">
      <div className="page-header relation-page-header mb-3">
        <div>
          <h1 className="page-title">Relations des entités</h1>
          <p className="page-subtitle">
            Retrouvez les pièces prévues dans les plans actifs et celles réellement consommées par
            les matériels de {graph?.company?.name ?? 'la société active'}.
          </p>
        </div>
      </div>

      {error ? (
        <StatusPanel as="section">
          <p role="alert" className="text-danger mb-3">
            {error}
          </p>
          <button type="button" className="btn btn-brand" onClick={load}>
            Réessayer
          </button>
        </StatusPanel>
      ) : (
        <section className="relations-card" aria-label="Cartographie des relations">
          <div className="relations-toolbar">
            <p className="small text-muted mb-0">
              Dépliez un matériel ou sélectionnez une pièce pour voir ses liens et consommations.
            </p>
            <div className="d-flex flex-wrap gap-2 ms-auto">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={collapseBranches}
              >
                Replier les branches
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setCollapsedIds(new Set());
                  setSelectedId(null);
                  setFocusId('company');
                }}
              >
                Tout déplier
              </button>
              {selectedId ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedId(null)}
                >
                  Effacer la sélection
                </button>
              ) : null}
            </div>
          </div>
          <div className="relations-canvas">
            {loading || !graph ? (
              <Loader label="Chargement de la cartographie" />
            ) : (
              <ReactFlow
                nodes={flow.nodes}
                edges={flow.edges}
                nodeTypes={nodeTypes}
                nodesConnectable={false}
                defaultMarkerColor="var(--relation-marker-color)"
                nodesDraggable={false}
                minZoom={0.2}
                maxZoom={1.6}
                onNodeClick={(_event, selectedNode) => selectNode(selectedNode.id)}
                onPaneClick={() => setSelectedId(null)}
                aria-label="Graphe interactif des relations entre les entités"
              >
                <Background gap={22} size={1} color="var(--relation-grid-color)" />
                <Controls showInteractive={false} />
              </ReactFlow>
            )}
          </div>
          {!loading && graph?.nodes.length === 1 ? (
            <p className="p-3 mb-0" role="status">
              Aucun matériel avec une pièce prévue ou consommée consultable dans cette société.
            </p>
          ) : null}
          <RelationDetails graph={graph} selectedId={selectedId} onSelect={selectNode} />
        </section>
      )}
    </main>
  );
}

export default function RelationsPage() {
  return (
    <ReactFlowProvider>
      <RelationsGraphPage />
    </ReactFlowProvider>
  );
}
