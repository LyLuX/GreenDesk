import { useCallback, useEffect, useState } from 'react';

import getApiErrorMessage from '../api/get-api-error-message.js';
import { getMaintenanceOrderList } from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import Button from './Button.jsx';
import Loader from './Loader.jsx';
import ManufacturerLogo from './ManufacturerLogo.jsx';
import Modal from './Modal.jsx';

const horizonOptions = [
  { value: 0, label: 'Aujourd’hui' },
  { value: 30, label: 'Sous 30 jours' },
  { value: 60, label: 'Sous 60 jours' },
  { value: 90, label: 'Sous 90 jours' },
  { value: 365, label: 'Sous un an' },
];

/** Formats the default part unit with its French plural when required. */
export const formatOrderQuantity = (quantity, unit) => {
  const numericQuantity = Number(quantity);
  const normalizedUnit = String(unit ?? '').trim();
  const displayedUnit =
    numericQuantity > 1 && normalizedUnit.toLocaleLowerCase('fr') === 'pièce'
      ? 'pièces'
      : normalizedUnit;
  return `${numericQuantity.toLocaleString('fr-FR')} ${displayedUnit}`.trim();
};

/** Displays parts aggregated from maintenance plans due in a chosen horizon. */
export default function MaintenanceOrderListModal({ open, onClose }) {
  const [filters, setFilters] = useState({ horizonDays: 30, includeOverdue: true });
  const [data, setData] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError('');
      try {
        const [response, manufacturerResponse] = await Promise.all([
          getMaintenanceOrderList(filters, signal),
          createReferenceApi('manufacturers')
            .list({}, signal)
            .catch(() => null),
        ]);
        setData(response.data.data);
        if (manufacturerResponse) setManufacturers(manufacturerResponse.data.data ?? []);
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, open]);

  const manufacturerByUuid = new Map(
    manufacturers.map((manufacturer) => [manufacturer.uuid, manufacturer]),
  );
  const horizonLabel =
    horizonOptions.find((option) => option.value === filters.horizonDays)?.label ?? '';

  return (
    <Modal open={open} title="Pièces à commander" onClose={onClose} busy={loading}>
      <div className="maintenance-order-list-printable">
        <header className="maintenance-order-print-header">
          <h1>Pièces à commander</h1>
          <p>
            Échéance : {horizonLabel}
            {filters.includeOverdue ? ' — plans en retard inclus' : ''}
          </p>
        </header>
        <div className="maintenance-order-list-controls mb-3 d-flex flex-wrap align-items-end gap-3">
          <label className="form-label mb-0 text-body-secondary">
            Échéance
            <select
              className="form-select"
              value={filters.horizonDays}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  horizonDays: Number(event.target.value),
                }))
              }
            >
              {horizonOptions.map((option) => (
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
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  includeOverdue: event.target.checked,
                }))
              }
            />
            <span className="form-check-label">Inclure les plans en retard</span>
          </label>
          <Button type="button" onClick={() => load()} disabled={loading}>
            Actualiser
          </Button>
        </div>
        {error && (
          <p role="alert" className="alert alert-danger">
            {error}
          </p>
        )}
        {loading && !data ? (
          <Loader label="Calcul de la liste de commande" />
        ) : data?.items?.length ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Pièce</th>
                    <th>Fournisseur / référence</th>
                    <th>Quantité</th>
                    <th>Plans concernés</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((part) => (
                    <tr key={part.uuid}>
                      <td>
                        <strong>{part.name}</strong>
                        {(part.manufacturer || part.manufacturerUuid) && (
                          <span className="mt-1 d-block">
                            <ManufacturerLogo
                              manufacturer={manufacturerByUuid.get(part.manufacturerUuid)}
                            />
                          </span>
                        )}
                      </td>
                      <td>
                        {part.supplier && <span className="d-block">{part.supplier}</span>}
                        <small className="text-body-secondary">
                          {part.supplierReference || part.reference}
                        </small>
                      </td>
                      <td>{formatOrderQuantity(part.quantity, part.unit)}</td>
                      <td>
                        <ul className="mb-0 ps-3">
                          {part.plans.map((plan) => (
                            <li key={plan.maintenanceUuid}>
                              {plan.material?.name} — {plan.quantity}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="maintenance-order-list-actions mt-3 d-flex justify-content-end">
              <Button type="button" disabled={loading} onClick={() => window.print()}>
                Imprimer la liste
              </Button>
            </div>
          </>
        ) : (
          <p className="mb-0">Aucune pièce à commander sur cette période.</p>
        )}
      </div>
    </Modal>
  );
}
