import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import getApiErrorMessage from '../api/get-api-error-message.js';
import { getMaintenanceOrderList, updateMaintenancePartStock } from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import { formatStockQuantity, STOCK_OPERATIONS } from '../inventory/stock-status.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import useNotification from '../notifications/useNotification.js';
import AppFooter from './AppFooter.jsx';
import Button from './Button.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
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
export const formatOrderQuantity = formatStockQuantity;

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
  orderQuantities = {},
  onOrderQuantityChange,
  onMarkOrdered,
  actionLoadingId,
}) {
  return (
    <div className="table-shell">
      <div className="table-responsive">
        <table className="maintenance-order-list-table table table-hover align-middle">
          <thead>
            <tr>
              <th>Pièce</th>
              <th>{showSupplier ? 'Fournisseur / référence' : 'Référence fournisseur'}</th>
              <th>Quantité</th>
              {showPlans ? <th>Plans concernés</th> : null}
              {onMarkOrdered ? <th>Commande</th> : null}
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => {
              const manufacturer = manufacturerByUuid.get(part.manufacturerUuid);
              const manufacturerName = part.manufacturer || manufacturer?.name;

              return (
                <tr key={part.uuid}>
                  <td className="maintenance-order-part-cell">
                    <div className="maintenance-order-part-summary d-flex align-items-center gap-2">
                      {showManufacturerLogo && (manufacturerName || part.manufacturerUuid) ? (
                        <ManufacturerLogo manufacturer={manufacturer} />
                      ) : null}
                      <strong>{part.name}</strong>
                    </div>
                    {!showManufacturerLogo && manufacturerName ? (
                      <small className="maintenance-order-print-manufacturer d-block mt-1">
                        {manufacturerName}
                      </small>
                    ) : null}
                  </td>
                  <td className="maintenance-order-supplier-cell">
                    {showSupplier && part.supplier ? (
                      <span className="d-block">{part.supplier}</span>
                    ) : null}
                    <small className="text-body-secondary">
                      {part.supplierReference || part.reference}
                    </small>
                  </td>
                  <td className="text-nowrap">{formatOrderQuantity(part.quantity, part.unit)}</td>
                  {showPlans ? (
                    <td className="maintenance-order-plans">
                      <ul className="mb-0 ps-3">
                        {part.plans.map((plan) => (
                          <li key={plan.maintenanceUuid}>
                            {plan.material?.name} — {plan.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ) : null}
                  {onMarkOrdered ? (
                    <td className="text-nowrap">
                      <div className="maintenance-order-command-controls d-flex align-items-end gap-2">
                        <label className="form-label mb-0 text-body-secondary">
                          <span className="visually-hidden">
                            Quantité commandée pour {part.name}
                          </span>
                          <input
                            className="form-control form-control-sm maintenance-order-quantity"
                            type="number"
                            min="1"
                            max="1000000"
                            step="1"
                            value={orderQuantities[part.uuid] ?? part.quantity}
                            onChange={(event) =>
                              onOrderQuantityChange(part.uuid, event.target.value)
                            }
                            disabled={actionLoadingId === part.uuid}
                          />
                        </label>
                        <Button
                          type="button"
                          className="btn-sm"
                          aria-label={`Marquer ${part.name} commandée`}
                          onClick={() => onMarkOrdered(part)}
                          disabled={actionLoadingId === part.uuid}
                        >
                          {actionLoadingId === part.uuid ? 'Traitement…' : 'Commander'}
                        </Button>
                      </div>
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
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [filters, setFilters] = useState(() => ({
    ...defaultOrderListFilters,
    ...initialFilters,
  }));
  const [data, setData] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

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
        const orderList = response.data.data;
        setData(orderList);
        setOrderQuantities(
          Object.fromEntries(
            (orderList.items ?? []).map((part) => [part.uuid, String(part.quantity)]),
          ),
        );
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
  const canUpdateStock = hasPermission(maintenancePermissions.parts.update);

  const requestMarkOrdered = (part) => {
    const quantity = Number(orderQuantities[part.uuid]);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) {
      setError('La quantité commandée doit être un entier positif.');
      return;
    }
    setError('');
    setConfirmation({ part, quantity });
  };

  const markOrdered = async () => {
    if (!confirmation || actionLoadingId) return;
    setActionLoadingId(confirmation.part.uuid);
    setError('');
    try {
      await updateMaintenancePartStock(confirmation.part.uuid, {
        operation: STOCK_OPERATIONS.ORDER,
        quantity: confirmation.quantity,
      });
      notify(
        'success',
        `${confirmation.part.name} marquée commandée (${formatOrderQuantity(
          confirmation.quantity,
          confirmation.part.unit,
        )}).`,
      );
      setConfirmation(null);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setConfirmation(null);
    } finally {
      setActionLoadingId(null);
    }
  };

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
              <OrderPartsTable
                parts={data.items}
                manufacturerByUuid={manufacturerByUuid}
                orderQuantities={orderQuantities}
                onOrderQuantityChange={
                  canUpdateStock
                    ? (uuid, value) =>
                        setOrderQuantities((current) => ({ ...current, [uuid]: value }))
                    : undefined
                }
                onMarkOrdered={canUpdateStock ? requestMarkOrdered : undefined}
                actionLoadingId={actionLoadingId}
              />
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
      <ConfirmDialog
        open={Boolean(confirmation)}
        title="Marquer la pièce commandée"
        description={
          confirmation
            ? `« ${confirmation.part.name} » sera retirée de la liste des pièces à commander. Quantité commandée : ${formatOrderQuantity(
                confirmation.quantity,
                confirmation.part.unit,
              )}.`
            : ''
        }
        confirmLabel="Marquer commandée"
        onClose={() => !actionLoadingId && setConfirmation(null)}
        onConfirm={markOrdered}
        busy={Boolean(actionLoadingId)}
        destructive={false}
      />
    </>
  );
}
