import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import getApiErrorMessage from '../api/get-api-error-message.js';
import { getMaintenanceOrderList, updateMaintenancePartStock } from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import { formatStockQuantity, STOCK_OPERATIONS } from '../inventory/stock-status.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import {
  defaultMaintenanceDeadlineFilters,
  getMaintenanceDeadlineFilters,
  maintenanceHorizonOptions,
} from '../maintenance/maintenance-deadline-filters.js';
import useNotification from '../notifications/useNotification.js';
import { extractPageItems, paginateItems } from '../utils/pagination.js';
import AppFooter from './AppFooter.jsx';
import Button from './Button.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import Loader from './Loader.jsx';
import ManufacturerLogo from './ManufacturerLogo.jsx';
import Modal from './Modal.jsx';
import PaginationControls from './PaginationControls.jsx';
import PrintableBrandHeader from './PrintableBrandHeader.jsx';

const defaultOrderListFilters = Object.freeze({
  ...defaultMaintenanceDeadlineFilters,
  includeLowStock: false,
  lowStockOnly: false,
});

/** Converts the maintenance page deadline filter into the matching order-list period. */
export const getOrderListFiltersForDeadline = (deadlineStatus) => {
  return {
    ...getMaintenanceDeadlineFilters(deadlineStatus),
    includeLowStock: false,
    lowStockOnly: false,
  };
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
  printPlans = false,
  showManufacturerLogo = true,
  orderQuantities = {},
  onOrderQuantityChange,
  onMarkOrdered,
  actionLoadingId,
  lowStockMode = false,
}) {
  return (
    <div className="table-shell">
      <div className="table-responsive">
        <table className="maintenance-order-list-table table table-hover align-middle">
          <thead>
            <tr>
              <th>Pièce</th>
              <th>{showSupplier ? 'Fournisseur / référence' : 'Référence fournisseur'}</th>
              {showPlans && printPlans ? <th>Plan concerné</th> : null}
              <th>{lowStockMode ? 'Stock disponible' : 'Quantité'}</th>
              {lowStockMode ? <th>Quantité commandée</th> : null}
              {showPlans && !printPlans ? <th>Plans concernés</th> : null}
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
                  {showPlans && printPlans ? (
                    <td className="maintenance-order-plans">
                      <ul className="mb-0 ps-3">
                        {part.lowStock ? (
                          <li key="low-stock">
                            Stock faible : {formatStockQuantity(part.quantityOnHand, part.unit)}
                          </li>
                        ) : null}
                        {(part.plans ?? []).map((plan) => (
                          <li key={plan.maintenanceUuid}>
                            {plan.title}
                            {plan.material?.name ? ` — ${plan.material.name}` : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ) : null}
                  <td>
                    {lowStockMode
                      ? formatStockQuantity(part.quantityOnHand, part.unit)
                      : `${part.quantity} ${part.unit}`}
                  </td>
                  {lowStockMode ? (
                    <td>{formatStockQuantity(part.quantityOnOrder, part.unit)}</td>
                  ) : null}
                  {showPlans && !printPlans ? (
                    <td className="maintenance-order-plans">
                      <ul className="mb-0 ps-3">
                        {part.lowStock ? (
                          <li key="low-stock">
                            Stock faible : {formatStockQuantity(part.quantityOnHand, part.unit)}
                          </li>
                        ) : null}
                        {(part.plans ?? []).map((plan) => (
                          <li
                            key={plan.maintenanceUuid}
                            className={
                              plan.wearBased ? 'maintenance-order-plan-wear-based' : undefined
                            }
                          >
                            {plan.material?.name} — {plan.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ) : null}
                  {onMarkOrdered ? (
                    <td>
                      <div className="maintenance-order-command-controls d-flex align-items-end gap-2">
                        <label className="form-label mb-0 text-body-secondary">
                          <span className="visually-hidden">
                            Quantité commandée pour {part.name}
                          </span>
                          <input
                            className="form-control form-control-sm maintenance-order-quantity"
                            type="number"
                            min="0.01"
                            max="1000000"
                            step="0.01"
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

function MaintenanceOrderPrintPages({
  supplierPages,
  manufacturerByUuid,
  companyName,
  lowStockMode = false,
}) {
  return (
    <div className="maintenance-order-list-printable" aria-hidden="true">
      {supplierPages.map((page) => (
        <section className="maintenance-order-print-page" key={page.key}>
          <PrintableBrandHeader companyName={companyName} />
          <main className="maintenance-order-print-content">
            <h1>{lowStockMode ? 'Pièces avec un stock faible' : 'Pièces à commander'}</h1>
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
              printPlans={!lowStockMode}
              showPlans={!lowStockMode}
              showManufacturerLogo={false}
              lowStockMode={lowStockMode}
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
  const { hasPermission, activeCompany } = useAuth();
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
  const [lowStockPageNumber, setLowStockPageNumber] = useState(1);
  const [lowStockLimit, setLowStockLimit] = useState(5);
  const latestRequestId = useRef(0);

  const load = useCallback(
    async (signal) => {
      const requestId = latestRequestId.current + 1;
      latestRequestId.current = requestId;
      setLoading(true);
      setError('');
      try {
        const [response, manufacturerResponse] = await Promise.all([
          getMaintenanceOrderList(filters, signal),
          createReferenceApi('manufacturers')
            .list({ limit: 25 }, signal)
            .catch(() => null),
        ]);
        if (requestId !== latestRequestId.current || signal?.aborted) return;
        const orderList = response.data.data;
        setData(orderList);
        setOrderQuantities(
          Object.fromEntries(
            (orderList.items ?? []).map((part) => [part.uuid, String(part.quantity)]),
          ),
        );
        if (manufacturerResponse) {
          setManufacturers(extractPageItems(manufacturerResponse.data.data));
        }
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

  const manufacturerByUuid = new Map(
    manufacturers.map((manufacturer) => [manufacturer.uuid, manufacturer]),
  );
  const lowStockMode = Boolean(filters.lowStockOnly);
  const lowStockPage = paginateItems(data?.items ?? [], lowStockPageNumber, lowStockLimit);
  const visibleParts = lowStockMode ? lowStockPage.items : data?.items;
  const supplierGroups = groupOrderPartsBySupplier(data?.items);
  const supplierPages = paginateSupplierGroups(supplierGroups);
  const canIncludeLowStock = hasPermission(maintenancePermissions.parts.read);
  const canOrderParts = !lowStockMode && hasPermission(maintenancePermissions.parts.stock.order);

  const requestMarkOrdered = (part) => {
    const quantity = Number(orderQuantities[part.uuid]);
    if (!Number.isFinite(quantity) || quantity < 0.01 || quantity > 1000000) {
      setError('La quantité commandée doit être positive.');
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
        `${confirmation.part.name} marquée commandée (${confirmation.quantity} ${confirmation.part.unit}).`,
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
        title={lowStockMode ? 'Pièces avec un stock faible' : 'Pièces à commander'}
        onClose={onClose}
        busy={loading}
        className="maintenance-order-list-modal"
      >
        <div className="maintenance-order-list-screen">
          {!lowStockMode ? (
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
              <label className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={filters.includeWearBased}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: undefined,
                      includeWearBased: event.target.checked,
                    }))
                  }
                />
                <span className="form-check-label">Inclure les plans selon usure</span>
              </label>
              {canIncludeLowStock ? (
                <label className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={filters.includeLowStock}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        includeLowStock: event.target.checked,
                      }))
                    }
                  />
                  <span className="form-check-label">Inclure les pièces avec un stock faible</span>
                </label>
              ) : null}
            </div>
          ) : null}
          {error && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
              <p role="alert" className="mb-0">
                {error}
              </p>
              <Button type="button" className="btn-sm" onClick={() => load()} disabled={loading}>
                Réessayer
              </Button>
            </div>
          )}
          <div className="maintenance-order-list-scroll">
            {loading && !data ? (
              <Loader
                label={
                  lowStockMode
                    ? 'Chargement des pièces avec un stock faible'
                    : 'Calcul de la liste de commande'
                }
              />
            ) : visibleParts?.length ? (
              <OrderPartsTable
                parts={visibleParts}
                manufacturerByUuid={manufacturerByUuid}
                orderQuantities={orderQuantities}
                onOrderQuantityChange={
                  canOrderParts
                    ? (uuid, value) =>
                        setOrderQuantities((current) => ({ ...current, [uuid]: value }))
                    : undefined
                }
                onMarkOrdered={canOrderParts ? requestMarkOrdered : undefined}
                actionLoadingId={actionLoadingId}
                lowStockMode={lowStockMode}
              />
            ) : (
              <p className="mb-0">
                {lowStockMode
                  ? 'Aucune pièce avec un stock faible.'
                  : 'Aucune pièce à commander sur cette période.'}
              </p>
            )}
          </div>
          {lowStockMode && data?.items?.length ? (
            <PaginationControls
              pagination={lowStockPage.pagination}
              limit={lowStockLimit}
              itemLabel="pièce(s)"
              disabled={loading}
              onLimitChange={(value) => {
                setLowStockLimit(value);
                setLowStockPageNumber(1);
              }}
              onPageChange={setLowStockPageNumber}
            />
          ) : null}
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
              companyName={activeCompany?.name}
              lowStockMode={lowStockMode}
            />,
            document.body,
          )
        : null}
      <ConfirmDialog
        open={Boolean(confirmation)}
        title="Marquer la pièce commandée"
        description={
          confirmation
            ? `« ${confirmation.part.name} » sera retirée de la liste des pièces à commander. Quantité commandée : ${confirmation.quantity} ${confirmation.part.unit}.`
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
