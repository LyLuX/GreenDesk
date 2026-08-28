import { useCallback, useEffect, useState } from 'react';

import getApiErrorMessage from '../api/get-api-error-message.js';
import { listHistory } from '../api/history.api.js';
import Button from '../components/Button.jsx';
import DataTable from '../components/DataTable.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import Loader from '../components/Loader.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import {
  historyActionLabels,
  historyActionVariants,
  historySectionConfig,
  historyTypeLabels,
} from '../history/history.config.js';
import { auditValuesAreEqual } from '../history/audit-values.js';
import { formatCurrency, formatOperationDateTime } from '../utils/formatters.js';

const fieldLabels = Object.freeze({
  name: 'Nom',
  title: 'Désignation',
  description: 'Description',
  email: 'E-mail',
  active: 'Statut actif',
  isActive: 'Compte actif',
  reference: 'Référence',
  supplierReference: 'Référence fournisseur',
  quantityOnHand: 'Stock disponible',
  quantityOnOrder: 'Quantité commandée',
  unitPrice: 'Prix unitaire',
  permissions: 'Permissions',
  roles: 'Rôles',
});

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return 'non renseigné';
  if (typeof value === 'boolean') return value ? 'oui' : 'non';
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'object' ? entry.name || entry.label || entry.uuid : entry))
      .join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const auditChanges = ({ oldValues, newValues }) => {
  const keys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);
  return [...keys]
    .filter((key) => !auditValuesAreEqual(key, oldValues?.[key], newValues?.[key]))
    .slice(0, 3)
    .map((key) => {
      const label = fieldLabels[key] || key;
      if (!oldValues) return `${label} : ${displayValue(newValues?.[key])}`;
      if (!newValues) return `${label} : ${displayValue(oldValues?.[key])}`;
      return `${label} : ${displayValue(oldValues?.[key])} → ${displayValue(newValues?.[key])}`;
    });
};

const stockDetails = (details) => {
  const fragments = [];
  if (Number(details.quantityOnHandChange)) {
    fragments.push(
      `Disponible ${Number(details.quantityOnHandChange) > 0 ? '+' : ''}${details.quantityOnHandChange}`,
    );
  }
  if (Number(details.quantityOnOrderChange)) {
    fragments.push(
      `Commandé ${Number(details.quantityOnOrderChange) > 0 ? '+' : ''}${details.quantityOnOrderChange}`,
    );
  }
  fragments.push(
    `Après opération : ${details.quantityOnHandAfter} disponible(s), ${details.quantityOnOrderAfter} commandée(s)`,
  );
  return fragments;
};

const renderDetails = (row) => {
  const details = row.details || {};
  let lines = [];
  if (row.type === 'stock_movement') lines = stockDetails(details);
  else if (row.type === 'price_change') {
    lines = [`${formatCurrency(details.previousUnitPrice)} → ${formatCurrency(details.unitPrice)}`];
  } else if (['planned_execution', 'unplanned_intervention'].includes(row.type)) {
    lines = [details.comment || details.description].filter(Boolean);
    if (details.parts?.length) {
      lines.push(
        details.parts.map((part) => `${part.name} : ${part.quantity} ${part.unit}`).join(', '),
      );
      lines.push(`Coût total : ${formatCurrency(details.totalCost)}`);
    }
  } else lines = auditChanges(details);

  return lines.length ? (
    <span className="history-details multiline-text">{lines.join('\n')}</span>
  ) : (
    '—'
  );
};

const columns = [
  {
    key: 'occurredAt',
    label: 'Date et heure',
    render: (value, row) => formatOperationDateTime(value, row.recordedAt),
  },
  {
    key: 'type',
    label: 'Type',
    render: (value) => historyTypeLabels[value] || value,
  },
  {
    key: 'subject',
    label: 'Élément',
    render: (value, row) => (
      <>
        <strong>{value?.label || '—'}</strong>
        {row.context?.label && (
          <span className="d-block text-body-secondary small">{row.context.label}</span>
        )}
      </>
    ),
  },
  {
    key: 'action',
    label: 'Action',
    render: (value) => (
      <span className={`status-badge history-action-${historyActionVariants[value] || 'neutral'}`}>
        {historyActionLabels[value] || value}
      </span>
    ),
  },
  { key: 'details', label: 'Détails', render: (_value, row) => renderDetails(row) },
  {
    key: 'user',
    label: 'Utilisateur',
    render: (value) =>
      value ? `${value.firstName || ''} ${value.lastName || ''}`.trim() || value.email : 'Système',
  },
];

function HistorySectionPage({ section }) {
  const config = historySectionConfig[section];
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [through, setThrough] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const load = useCallback(
    async (signal) => {
      setIsLoading(true);
      try {
        const response = await listHistory(
          section,
          { page, limit, search: debouncedSearch, type, from, through },
          signal,
        );
        const payload = response.data.data;
        setRows(payload.items || []);
        setPagination(payload.pagination || null);
        setError('');
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [debouncedSearch, from, limit, page, section, through, type],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <main className="app-page">
      <div className="page-header mb-3">
        <h1 className="page-title">{config.title}</h1>
        <p className="page-subtitle">{config.subtitle}</p>
      </div>

      <FilterPanel
        fields={[
          {
            name: 'search',
            type: 'search',
            ariaLabel: 'Rechercher dans l’historique',
            placeholder: 'Élément, action ou utilisateur',
            value: search,
            onChange: updateFilter(setSearch),
          },
          {
            name: 'type',
            type: 'select',
            label: 'Type',
            emptyLabel: 'Tous les types',
            options: config.types,
            value: type,
            onChange: updateFilter(setType),
          },
          {
            name: 'from',
            type: 'date',
            label: 'Du',
            value: from,
            onChange: updateFilter(setFrom),
          },
          {
            name: 'through',
            type: 'date',
            label: 'Au',
            value: through,
            onChange: updateFilter(setThrough),
          },
        ]}
      />

      {error && (
        <div
          role="alert"
          className="alert alert-danger d-flex align-items-center justify-content-between"
        >
          <p className="mb-0">{error}</p>
          <Button onClick={() => load()}>Réessayer</Button>
        </div>
      )}
      {isLoading ? (
        <Loader label="Chargement de l’historique" />
      ) : (
        <DataTable
          compact
          columns={columns}
          rows={rows}
          emptyMessage={
            search || type || from || through
              ? 'Aucun événement ne correspond aux filtres.'
              : 'Aucun événement enregistré.'
          }
        />
      )}
      {!isLoading && (
        <PaginationControls
          pagination={pagination}
          limit={limit}
          itemLabel={config.itemLabel}
          disabled={isLoading}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          onPageChange={setPage}
        />
      )}
    </main>
  );
}

/** Shared paginated table remounted for each consolidated history section. */
export default function HistoryPage({ section }) {
  return <HistorySectionPage key={section} section={section} />;
}
