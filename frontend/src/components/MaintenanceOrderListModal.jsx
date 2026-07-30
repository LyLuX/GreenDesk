import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import getApiErrorMessage from '../api/get-api-error-message.js';
import { getMaintenanceOrderList } from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import AppFooter from './AppFooter.jsx';
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

const defaultOrderListFilters = Object.freeze({ horizonDays: 30, includeOverdue: true });

/** Converts the maintenance page deadline filter into the matching order-list period. */
export const getOrderListFiltersForDeadline = (deadlineStatus) => {
  const filtersByDeadline = {
    overdue: { status: 'overdue', horizonDays: 0, includeOverdue: true },
    dueToday: { status: 'dueToday', horizonDays: 0, includeOverdue: false },
    upcoming: { status: 'upcoming', horizonDays: 30, includeOverdue: false },
    upToDate: { status: 'upToDate', horizonDays: 365, includeOverdue: false },
  };
  return filtersByDeadline[deadlineStatus] ?? { ...defaultOrderListFilters };
};

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

/** Groups ordered parts by supplier for one printed page per supplier. */
export const groupOrderPartsBySupplier = (parts = []) => {
  const groups = new Map();
  for (const part of parts) {
    const supplier = String(part.supplier ?? '').trim() || 'Fournisseur non renseigné';
    const key = part.supplierUuid || supplier.toLocaleLowerCase('fr');
    const group = groups.get(key) ?? { key, supplier, parts: [] };
    group.parts.push(part);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) =>
    left.supplier.localeCompare(right.supplier, 'fr', { sensitivity: 'base' }),
  );
};

/** Splits each supplier into complete A4-sized batches without dropping any part. */
export const paginateSupplierGroups = (groups = [], partsPerPage = 13) =>
  groups.flatMap((group) => {
    const pageCount = Math.ceil(group.parts.length / partsPerPage);
    return Array.from({ length: pageCount }, (_, pageIndex) => ({
      ...group,
      key: `${group.key}-page-${pageIndex + 1}`,
      parts: group.parts.slice(pageIndex * partsPerPage, (pageIndex + 1) * partsPerPage),
      pageNumber: pageIndex + 1,
      pageCount,
    }));
  });

function OrderPartsTable({
  parts,
  manufacturerByUuid,
  showSupplier = true,
  showPlans = true,
  showManufacturerLogo = true,
}) {
  return (
    <div className="table-shell">
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Pièce</th>
              <th>{showSupplier ? 'Fournisseur / référence' : 'Référence fournisseur'}</th>
              <th>Quantité</th>
              {showPlans ? <th>Plans concernés</th> : null}
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => {
              const manufacturer = manufacturerByUuid.get(part.manufacturerUuid);
              const manufacturerName = part.manufacturer || manufacturer?.name;

              return (
                <tr key={part.uuid}>
                  <td>
                    <strong>{part.name}</strong>
                    {showManufacturerLogo && (manufacturerName || part.manufacturerUuid) ? (
                      <span className="mt-1 d-block">
                        <ManufacturerLogo manufacturer={manufacturer} />
                      </span>
                    ) : null}
                    {!showManufacturerLogo && manufacturerName ? (
                      <small className="maintenance-order-print-manufacturer d-block mt-1">
                        {manufacturerName}
                      </small>
                    ) : null}
                  </td>
                  <td>
                    {showSupplier && part.supplier ? (
                      <span className="d-block">{part.supplier}</span>
                    ) : null}
                    <small className="text-body-secondary">
                      {part.supplierReference || part.reference}
                    </small>
                  </td>
                  <td>{formatOrderQuantity(part.quantity, part.unit)}</td>
                  {showPlans ? (
                    <td>
                      <ul className="mb-0 ps-3">
                        {part.plans.map((plan) => (
                          <li key={plan.maintenanceUuid}>
                            {plan.material?.name} — {plan.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrintBrandHeader() {
  return (
    <header className="maintenance-order-print-header">
      <div className="maintenance-order-print-brand">
        <img className="brand-logo" src="/brand-logo.jpg" alt="EI BOURNAZEL Paul" />
        <span>
          <span className="brand-name d-block">GreenDesk</span>
          <span className="brand-company d-block">EI BOURNAZEL Paul</span>
        </span>
      </div>
    </header>
  );
}

function MaintenanceOrderPrintPages({ supplierPages, manufacturerByUuid }) {
  return (
    <div className="maintenance-order-list-printable" aria-hidden="true">
      {supplierPages.map((page) => (
        <section className="maintenance-order-print-page" key={page.key}>
          <PrintBrandHeader />
          <main className="maintenance-order-print-content">
            <h1>Pièces à commander</h1>
            <p className="maintenance-order-print-supplier">
              Fournisseur : <strong>{page.supplier}</strong>
              {page.pageCount > 1 ? (
                <span>
                  {' '}
                  — page {page.pageNumber}/{page.pageCount}
                </span>
              ) : null}
            </p>
            <OrderPartsTable
              parts={page.parts}
              manufacturerByUuid={manufacturerByUuid}
              showSupplier={false}
              showPlans={false}
              showManufacturerLogo={false}
            />
          </main>
          <div className="maintenance-order-print-footer">
            <AppFooter />
          </div>
        </section>
      ))}
    </div>
  );
}

/** Displays parts aggregated from maintenance plans due in a chosen horizon. */
export default function MaintenanceOrderListModal({ open, onClose, initialFilters }) {
  const [filters, setFilters] = useState(() => ({
    ...defaultOrderListFilters,
    ...initialFilters,
  }));
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
  const supplierGroups = groupOrderPartsBySupplier(data?.items);
  const supplierPages = paginateSupplierGroups(supplierGroups);

  return (
    <>
      <Modal
        open={open}
        title="Pièces à commander"
        onClose={onClose}
        busy={loading}
        className="maintenance-order-list-modal"
      >
        <div className="maintenance-order-list-screen">
          <div className="maintenance-order-list-controls mb-3 d-flex flex-wrap align-items-end gap-3">
            <label className="form-label mb-0 text-body-secondary">
              Échéance
              <select
                className="form-select"
                value={filters.horizonDays}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: undefined,
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
                    status: undefined,
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
          <div className="maintenance-order-list-scroll">
            {loading && !data ? (
              <Loader label="Calcul de la liste de commande" />
            ) : data?.items?.length ? (
              <OrderPartsTable parts={data.items} manufacturerByUuid={manufacturerByUuid} />
            ) : (
              <p className="mb-0">Aucune pièce à commander sur cette période.</p>
            )}
          </div>
          {data?.items?.length ? (
            <div className="maintenance-order-list-actions mt-3 d-flex justify-content-end">
              <Button type="button" disabled={loading} onClick={() => window.print()}>
                Imprimer la liste
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
      {open && supplierPages.length
        ? createPortal(
            <MaintenanceOrderPrintPages
              supplierPages={supplierPages}
              manufacturerByUuid={manufacturerByUuid}
            />,
            document.body,
          )
        : null}
    </>
  );
}
