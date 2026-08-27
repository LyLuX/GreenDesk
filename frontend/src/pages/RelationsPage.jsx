import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import StatusPanel from '../components/StatusPanel.jsx';

const NODE_WIDTH = 230;
const NODE_HEIGHT = 124;
const edgeStyles = Object.freeze({
  group: { stroke: '#82918a', strokeWidth: 1.5 },
  direct: { stroke: '#287a50', strokeWidth: 2 },
  association: { stroke: '#6b57a4', strokeWidth: 2 },
  derived: { stroke: '#b37816', strokeWidth: 2, strokeDasharray: '7 5' },
});

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
  layout.setGraph({ rankdir: 'LR', ranksep: 105, nodesep: 46, marginx: 28, marginy: 28 });
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
        <strong>{data.label}</strong>
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
      {Number.isInteger(data.count) ? (
        <span className="relation-node-count">
          {data.count.toLocaleString('fr-FR')} enregistrement{data.count === 1 ? '' : 's'}
        </span>
      ) : (
        <span className="relation-node-description">{data.description}</span>
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

function RelationsGraphPage() {
  const navigate = useNavigate();
  const { fitView } = useReactFlow();
  const { activeCompany } = useAuth();
  const [mode, setMode] = useState('simplified');
  const [graph, setGraph] = useState(null);
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getRelationsGraph(mode, 'records');
      const next = response.data?.data;
      if (!next || !Array.isArray(next.nodes) || !Array.isArray(next.edges)) {
        throw new Error('Réponse de cartographie invalide.');
      }
      setGraph(next);
      setCollapsedIds(new Set());
      setSelectedId(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [mode, activeCompany?.uuid]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleNode = useCallback((id) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
        collapsible: item.id !== 'company' && hierarchySources.has(item.id),
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
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: {
          ...edgeStyles[item.kind],
          opacity: isRelated ? 1 : 0.16,
        },
      };
    });
    return { nodes: layoutedNodes, edges: flowEdges };
  }, [collapsedIds, graph, navigate, selectedId, toggleNode]);

  const collapseDomains = () => {
    const domainIds =
      graph?.nodes.filter(({ kind }) => kind === 'domain').map(({ id }) => id) ?? [];
    setCollapsedIds(new Set(domainIds));
    setSelectedId(null);
  };

  useEffect(() => {
    if (loading || !flow.nodes.length) return undefined;
    const frame = window.requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 240 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [collapsedIds, fitView, flow.nodes.length, loading, mode]);

  return (
    <main className="app-page relations-page">
      <div className="page-header relation-page-header mb-3">
        <div>
          <h1 className="page-title">Relations des entités</h1>
          <p className="page-subtitle">
            Explorez les enregistrements et leurs relations pour{' '}
            {graph?.company?.name ?? 'la société active'}.
          </p>
        </div>
        <div className="relation-mode-switch" role="group" aria-label="Niveau de détail">
          <button
            type="button"
            className={`btn ${mode === 'simplified' ? 'btn-brand' : 'btn-outline-brand'}`}
            aria-pressed={mode === 'simplified'}
            onClick={() => setMode('simplified')}
          >
            Vue simplifiée
          </button>
          <button
            type="button"
            className={`btn ${mode === 'complete' ? 'btn-brand' : 'btn-outline-brand'}`}
            aria-pressed={mode === 'complete'}
            onClick={() => setMode('complete')}
          >
            Vue complète
          </button>
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
            <div className="d-flex flex-wrap gap-2 ms-auto">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={collapseDomains}
              >
                Replier les branches
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setCollapsedIds(new Set())}
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
                nodesDraggable={false}
                minZoom={0.2}
                maxZoom={1.6}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                onNodeClick={(_event, selectedNode) => setSelectedId(selectedNode.id)}
                onPaneClick={() => setSelectedId(null)}
                aria-label="Graphe interactif des relations entre les entités"
              >
                <Background gap={22} size={1} color="#d8e2dc" />
                <Controls showInteractive={false} />
              </ReactFlow>
            )}
          </div>
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
