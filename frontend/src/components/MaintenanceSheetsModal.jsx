import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import getApiErrorMessage from '../api/get-api-error-message.js';
import { getMaintenanceSheets } from '../api/maintenance.api.js';
import useAuth from '../auth/useAuth.js';
import {
  defaultMaintenanceDeadlineFilters,
  maintenanceHorizonOptions,
} from '../maintenance/maintenance-deadline-filters.js';
import {
  maintenancePriorityBadgeClasses,
  maintenancePriorityLabels,
  maintenanceStatusClasses,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
} from '../maintenance/maintenance.labels.js';
import { formatDate } from '../utils/formatters.js';
import AppFooter from './AppFooter.jsx';
import Button from './Button.jsx';
import Loader from './Loader.jsx';
import Modal from './Modal.jsx';
import PrintableBrandHeader from './PrintableBrandHeader.jsx';

const sheetValue = (value) => value || '—';

function MaintenanceSheet({ sheet, printable = false }) {
  const statusClass = maintenanceStatusClasses[sheet.status];
  const priorityClass = maintenancePriorityBadgeClasses[sheet.priority];
  return (
    <article
      className={printable ? 'maintenance-sheet' : 'maintenance-sheet maintenance-sheet-preview'}
    >
      <div className="maintenance-sheet-heading d-flex flex-wrap justify-content-between gap-3">
        <div>
          <p className="maintenance-sheet-kicker mb-1">Fiche de maintenance</p>
          <h2 className="h4 mb-1">{sheet.title}</h2>
          <p className="mb-0 text-body-secondary">{sheet.material?.name ?? 'Matériel inconnu'}</p>
        </div>
        <div className="d-flex flex-wrap align-items-start gap-2">
          <span className={`status-badge ${statusClass ?? ''}`.trim()}>
            {maintenanceStatusLabels[sheet.status] ?? sheet.status}
          </span>
          <span className={`status-badge ${priorityClass ?? ''}`.trim()}>
            {maintenancePriorityLabels[sheet.priority] ?? sheet.priority}
          </span>
        </div>
      </div>

      <dl className="maintenance-sheet-details">
        <div>
          <dt>Modèle</dt>
          <dd>{sheetValue(sheet.material?.model)}</dd>
        </div>
        <div>
          <dt>N° de série</dt>
          <dd>{sheetValue(sheet.material?.serialNumber)}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{maintenanceTypeLabels[sheet.maintenanceType] ?? sheet.maintenanceType}</dd>
        </div>
        <div>
          <dt>Dernier entretien</dt>
          <dd>{formatDate(sheet.lastMaintenanceDate)}</dd>
        </div>
        <div>
          <dt>Prochaine échéance</dt>
          <dd>
            {sheet.status === 'wearBased' ? 'Selon l’usure' : formatDate(sheet.nextMaintenanceDate)}
          </dd>
        </div>
        <div>
          <dt>Intervalle</dt>
          <dd>{sheet.intervalDays ? `${sheet.intervalDays} jours` : 'Selon l’usure'}</dd>
        </div>
      </dl>

      <section className="maintenance-sheet-section">
        <h3>Description de l’intervention</h3>
        <p className="multiline-text mb-0">{sheetValue(sheet.description)}</p>
      </section>

      <section className="maintenance-sheet-section">
        <h3>Pièces prévues</h3>
        {sheet.parts?.length ? (
          <div className="table-shell">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Pièce</th>
                  <th>Référence</th>
                  <th>Quantité</th>
                </tr>
              </thead>
              <tbody>
                {sheet.parts.map((part) => (
                  <tr key={part.uuid}>
                    <td>{part.name}</td>
                    <td>{part.reference}</td>
                    <td>
                      {Number(part.quantity).toLocaleString('fr-FR')} {part.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mb-0">Aucune pièce prévue.</p>
        )}
      </section>

      <section className="maintenance-sheet-section">
        <h3>Notes</h3>
        <p className="multiline-text mb-0">{sheetValue(sheet.notes)}</p>
      </section>

      <section className="maintenance-sheet-completion" aria-label="Compte rendu à compléter">
        <h3>Compte rendu de l’intervention</h3>
        <div className="maintenance-sheet-completion-grid">
          <p>
            Date d'intervention : <span />
          </p>
          <p>
            Technicien : <span />
          </p>
        </div>
        <p>
          Observations : <span />
        </p>
        <p className="maintenance-sheet-signature">
          Signature : <span />
        </p>
      </section>
    </article>
  );
}

function MaintenanceSheetPrintPages({ items, companyName }) {
  return (
    <div className="maintenance-sheets-printable" aria-hidden="true">
      {items.map((sheet) => (
        <section className="maintenance-sheet-print-page" key={sheet.uuid}>
          <PrintableBrandHeader companyName={companyName} />
          <main className="maintenance-sheet-print-content">
            <MaintenanceSheet sheet={sheet} printable />
          </main>
          <div className="maintenance-sheet-print-footer">
            <AppFooter />
          </div>
        </section>
      ))}
    </div>
  );
}

/** Displays and prints the maintenance plans selected by deadline. */
export default function MaintenanceSheetsModal({ open, onClose, initialFilters }) {
  const { activeCompany } = useAuth();
  const [filters, setFilters] = useState(() => ({
    ...defaultMaintenanceDeadlineFilters,
    ...initialFilters,
  }));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const latestRequestId = useRef(0);

  const load = useCallback(
    async (signal) => {
      const requestId = latestRequestId.current + 1;
      latestRequestId.current = requestId;
      setLoading(true);
      setError('');
      try {
        const response = await getMaintenanceSheets(filters, signal);
        if (requestId !== latestRequestId.current || signal?.aborted) return;
        setData(response.data.data);
      } catch (requestError) {
        if (requestId === latestRequestId.current && requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (requestId === latestRequestId.current && !signal?.aborted) setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => {
      controller.abort();
      latestRequestId.current += 1;
    };
  }, [load, open]);

  const updateFilter = (values) =>
    setFilters((current) => ({ ...current, status: undefined, ...values }));
  const items = data?.items ?? [];

  return (
    <>
      <Modal
        open={open}
        title="Fiches de maintenance"
        subtitle="Sélectionnez les échéances à préparer pour les techniciens."
        onClose={onClose}
        busy={loading}
        className="maintenance-sheets-modal"
      >
        <div className="maintenance-sheets-screen">
          <div className="maintenance-sheets-controls d-flex flex-wrap align-items-end gap-3">
            <label className="form-label mb-0 text-body-secondary">
              Échéance
              <select
                className="form-select"
                value={filters.horizonDays}
                onChange={(event) => updateFilter({ horizonDays: Number(event.target.value) })}
              >
                {maintenanceHorizonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={filters.includeOverdue}
                onChange={(event) => updateFilter({ includeOverdue: event.target.checked })}
              />
              <span className="form-check-label">Inclure les plans en retard</span>
            </label>
            <label className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={filters.includeWearBased}
                onChange={(event) => updateFilter({ includeWearBased: event.target.checked })}
              />
              <span className="form-check-label">Inclure les plans selon usure</span>
            </label>
          </div>

          {error ? (
            <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
              <p role="alert" className="mb-0">
                {error}
              </p>
              <Button type="button" className="btn-sm" onClick={() => load()} disabled={loading}>
                Réessayer
              </Button>
            </div>
          ) : null}

          <div className="maintenance-sheets-scroll">
            {loading && !data ? (
              <Loader label="Chargement des fiches de maintenance" />
            ) : items.length ? (
              items.map((sheet) => <MaintenanceSheet sheet={sheet} key={sheet.uuid} />)
            ) : (
              <p className="mb-0">Aucune fiche de maintenance sur cette période.</p>
            )}
          </div>

          {items.length ? (
            <div className="maintenance-sheets-actions d-flex justify-content-end">
              <Button type="button" disabled={loading} onClick={() => window.print()}>
                Imprimer les fiches
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
      {open && items.length
        ? createPortal(
            <MaintenanceSheetPrintPages items={items} companyName={activeCompany?.name} />,
            document.body,
          )
        : null}
    </>
  );
}
