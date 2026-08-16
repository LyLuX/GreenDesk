import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardSummary } from '../api/dashboard.api.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import StatusPanel from '../components/StatusPanel.jsx';
import {
  maintenancePriorityBadgeClasses,
  maintenancePriorityLabels,
  maintenanceTypeLabels,
} from '../maintenance/maintenance.labels.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

const maintenanceCards = [
  {
    key: 'today',
    label: 'Entretiens aujourd’hui',
    modalTitle: 'Entretiens à faire aujourd’hui',
    status: 'dueToday',
    className: 'maintenance-due-today',
  },
  {
    key: 'upcoming',
    label: 'Entretiens sous 30 jours',
    modalTitle: 'Entretiens sous 30 jours',
    status: 'upcoming',
    className: 'maintenance-upcoming',
  },
  {
    key: 'overdue',
    label: 'Entretiens en retard',
    modalTitle: 'Entretiens en retard',
    status: 'overdue',
    className: 'maintenance-overdue',
  },
  {
    key: 'wearBased',
    label: 'Entretien selon usure',
    modalTitle: 'Entretien selon usure',
    status: 'wearBased',
    className: 'maintenance-wear-based',
  },
];

/** Converts a decimal number of years into a readable years-and-months duration. */
export const formatAverageAge = (value) => {
  const totalMonths = Math.max(0, Math.round((Number(value) || 0) * 12));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? 'an' : 'ans'}`);
  if (months || !parts.length) parts.push(`${months} mois`);
  return parts.join(' et ');
};

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [maintenanceDialog, setMaintenanceDialog] = useState(null);
  const load = useCallback(async () => {
    setError('');
    try {
      const response = await getDashboardSummary();
      const next = response.data?.data;
      if (!next || typeof next !== 'object')
        throw new Error('Réponse du tableau de bord invalide.');
      setData(next);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (error)
    return (
      <main className="loading-page d-grid align-items-center justify-content-center">
        <StatusPanel as="div">
          <p role="alert" className="text-danger mb-3">
            {error}
          </p>
          <button className="btn btn-brand" type="button" onClick={load}>
            Réessayer
          </button>
        </StatusPanel>
      </main>
    );
  if (!data)
    return (
      <main className="loading-page d-grid align-items-center justify-content-center">
        <Loader label="Chargement du tableau de bord" />
      </main>
    );
  const materials = data.materials ?? {};
  const categories = data.categories ?? {};
  const manufacturers = data.manufacturers ?? {};
  const fleet = data.fleet ?? {};
  const maintenance = data.maintenance ?? {};
  const maintenanceItems = maintenance.items?.[maintenanceDialog?.key] ?? [];
  const cardGroups = [
    {
      label: 'Matériels et catégories',
      cards: [
        ['Matériels', materials.total ?? 0],
        ['Matériels actifs', materials.active ?? 0],
        ['Matériels inactifs', materials.inactive ?? 0],
        ['Catégories', categories.total ?? 0],
        ['Fabricants', manufacturers.total ?? 0],
      ],
    },
    {
      label: 'Valeur du parc',
      cards: [
        ['Valeur du parc', formatCurrency(fleet.totalPurchaseValue)],
        ['Valeur moyennne', formatCurrency(fleet.averageCost)],
        ['Âge moyen', formatAverageAge(fleet.averageAge)],
      ],
    },
    ...(hasPermission(maintenancePermissions.plans.read)
      ? [
          {
            label: 'Entretien',
            cards: maintenanceCards.map((card) => ({
              ...card,
              value: maintenance[card.key] ?? 0,
              className: `${card.className} ${
                card.key === 'overdue' && Number(maintenance.overdue ?? 0) > 0
                  ? 'maintenance-overdue-alert'
                  : ''
              }`,
            })),
          },
        ]
      : []),
  ];
  return (
    <main className="app-page">
      <div className="page-header mb-3">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Vue d’ensemble du parc matériel et des opérations à suivre.</p>
      </div>
      <div className="dashboard-card-groups">
        {cardGroups.map((group) => (
          <section aria-label={group.label} className="dashboard-card-row" key={group.label}>
            {group.cards.map((card) => {
              const normalizedCard = Array.isArray(card)
                ? { label: card[0], value: card[1], className: card[2] ?? '' }
                : card;
              const count = Number(normalizedCard.value);
              return (
                <article
                  className={`metric-card h-100 p-4 ${normalizedCard.className}`}
                  key={normalizedCard.label}
                >
                  <p className="metric-label mb-2">{normalizedCard.label}</p>
                  {normalizedCard.status && count > 0 ? (
                    <button
                      type="button"
                      className="metric-value metric-value-button"
                      aria-label={`Voir les entretiens concernés : ${normalizedCard.label}`}
                      onClick={() => setMaintenanceDialog(normalizedCard)}
                    >
                      {normalizedCard.value}
                    </button>
                  ) : (
                    <strong className="metric-value">{normalizedCard.value}</strong>
                  )}
                </article>
              );
            })}
          </section>
        ))}
      </div>
      <Modal
        open={Boolean(maintenanceDialog)}
        title={maintenanceDialog?.modalTitle ?? ''}
        onClose={() => setMaintenanceDialog(null)}
      >
        {maintenanceItems.length === 0 ? (
          <p className="mb-0">Aucun entretien concerné.</p>
        ) : (
          <ul className="maintenance-summary-list">
            {maintenanceItems.map((item) => (
              <li className="maintenance-summary-item" key={item.uuid}>
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                  <div>
                    <strong className="d-block">{item.title}</strong>
                    <span className="maintenance-summary-material">{item.material?.name}</span>
                  </div>
                  <span
                    className={`status-badge ${
                      maintenancePriorityBadgeClasses[item.priority] ?? 'priority-normal'
                    }`}
                  >
                    {maintenancePriorityLabels[item.priority] ?? item.priority}
                  </span>
                </div>
                <dl className="maintenance-summary-details">
                  <div>
                    <dt>Type</dt>
                    <dd>{maintenanceTypeLabels[item.maintenanceType] ?? item.maintenanceType}</dd>
                  </div>
                  <div>
                    <dt>Date prévue</dt>
                    <dd>
                      {item.status === 'wearBased'
                        ? 'Selon l’usure'
                        : formatDate(item.nextMaintenanceDate)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
        {maintenanceDialog?.status && (
          <div className="mt-4 d-flex justify-content-end">
            <Link
              className="btn btn-outline-brand"
              to={`/maintenance?status=${encodeURIComponent(maintenanceDialog.status)}`}
            >
              Voir la maintenance
            </Link>
          </div>
        )}
      </Modal>
    </main>
  );
}
