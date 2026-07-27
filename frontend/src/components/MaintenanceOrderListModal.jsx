import { useCallback, useEffect, useState } from 'react';

import getApiErrorMessage from '../api/get-api-error-message.js';
import { getMaintenanceOrderList } from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import Button from './Button.jsx';
import Loader from './Loader.jsx';
import ManufacturerLogo from './ManufacturerLogo.jsx';
import Modal from './Modal.jsx';

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

  return (
    <Modal open={open} title="Pièces à commander" onClose={onClose} busy={loading}>
      <div className="mb-3 d-flex flex-wrap align-items-end gap-3">
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
            <option value="0">Aujourd’hui</option>
            <option value="30">Sous 30 jours</option>
            <option value="60">Sous 60 jours</option>
            <option value="90">Sous 90 jours</option>
            <option value="365">Sous un an</option>
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
                  <td>
                    {part.quantity} {part.unit}
                  </td>
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
      ) : (
        <p className="mb-0">Aucune pièce à commander sur cette période.</p>
      )}
    </Modal>
  );
}
