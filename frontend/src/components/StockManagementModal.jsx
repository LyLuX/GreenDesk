import { useCallback, useEffect, useState } from 'react';

import getApiErrorMessage from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';
import {
  listMaintenancePartPriceHistory,
  listMaintenancePartStockMovements,
  updateMaintenancePartPrice,
  updateMaintenancePartStock,
} from '../api/maintenance.api.js';
import {
  formatStockQuantity,
  STOCK_OPERATIONS,
  stockOperationPresentation,
} from '../inventory/stock-status.js';
import useNotification from '../notifications/useNotification.js';
import { MAX_MAINTENANCE_PART_UNIT_PRICE } from '../maintenance/maintenance-costs.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import Button from './Button.jsx';
import Loader from './Loader.jsx';
import Modal from './Modal.jsx';

const formatChange = (quantity, unit) => {
  const value = Number(quantity);
  if (!value) return '—';
  return `${value > 0 ? '+' : '−'}${formatStockQuantity(Math.abs(value), unit)}`;
};
const PRICE_OPERATION = 'price';
const operationDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});
const getCurrentOperationDate = (now = new Date()) => {
  const parts = Object.fromEntries(
    operationDateFormatter
      .formatToParts(now)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

/** Shared stock-operation dialog for a maintenance part. */
export default function StockManagementModal({ part, onClose, onUpdated }) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const canAdjustOnHand = hasPermission(maintenancePermissions.parts.stock.adjustOnHand);
  const canAdjustOnOrder = hasPermission(maintenancePermissions.parts.stock.adjustOnOrder);
  const canOrder = hasPermission(maintenancePermissions.parts.stock.order);
  const canReceive = hasPermission(maintenancePermissions.parts.stock.receive);
  const canUpdatePrice = hasPermission(maintenancePermissions.parts.price.update);
  const permittedOperations = [
    ...(canAdjustOnHand || canAdjustOnOrder
      ? [{ value: STOCK_OPERATIONS.ADJUST, label: 'Corriger les quantités' }]
      : []),
    ...(canOrder ? [{ value: STOCK_OPERATIONS.ORDER, label: 'Enregistrer une commande' }] : []),
    ...(canReceive
      ? [{ value: STOCK_OPERATIONS.RECEIVE, label: 'Réceptionner une commande' }]
      : []),
    ...(canUpdatePrice ? [{ value: PRICE_OPERATION, label: 'Modifier le prix unitaire' }] : []),
  ];
  const initialOperation = permittedOperations[0]?.value ?? '';
  const [currentPart, setCurrentPart] = useState(part);
  const [operation, setOperation] = useState(STOCK_OPERATIONS.ADJUST);
  const [quantity, setQuantity] = useState('1');
  const [quantityOnHand, setQuantityOnHand] = useState('0');
  const [quantityOnOrder, setQuantityOnOrder] = useState('0');
  const [unitPrice, setUnitPrice] = useState('0');
  const [performedAt, setPerformedAt] = useState(getCurrentOperationDate);
  const [movements, setMovements] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async (uuid, signal) => {
    setLoadingHistory(true);
    try {
      const [movementResponse, priceResponse] = await Promise.all([
        listMaintenancePartStockMovements(uuid, { page: 1, limit: 10 }, signal),
        listMaintenancePartPriceHistory(uuid, { page: 1, limit: 10 }, signal),
      ]);
      setMovements(movementResponse.data.data.items ?? []);
      setPriceHistory(priceResponse.data.data.items ?? []);
    } catch (requestError) {
      if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!part) return undefined;
    setCurrentPart(part);
    setQuantityOnHand(String(part.quantityOnHand ?? 0));
    setQuantityOnOrder(String(part.quantityOnOrder ?? 0));
    setUnitPrice(String(part.unitPrice ?? 0));
    setPerformedAt(getCurrentOperationDate());
    setQuantity('1');
    setOperation(initialOperation);
    setError('');
    const controller = new AbortController();
    loadHistory(part.uuid, controller.signal);
    return () => controller.abort();
  }, [initialOperation, loadHistory, part]);

  if (!part || !currentPart) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const stockPayload = { operation, performedAt };
      if (operation === STOCK_OPERATIONS.ADJUST) {
        if (canAdjustOnHand) stockPayload.quantityOnHand = Number(quantityOnHand);
        if (canAdjustOnOrder) stockPayload.quantityOnOrder = Number(quantityOnOrder);
      } else {
        stockPayload.quantity = Number(quantity);
      }
      const response =
        operation === PRICE_OPERATION
          ? await updateMaintenancePartPrice(part.uuid, {
              unitPrice: Number(unitPrice),
              performedAt,
            })
          : await updateMaintenancePartStock(part.uuid, stockPayload);
      const updatedPart = response.data.data;
      setCurrentPart(updatedPart);
      setQuantityOnHand(String(updatedPart.quantityOnHand));
      setQuantityOnOrder(String(updatedPart.quantityOnOrder));
      setUnitPrice(String(updatedPart.unitPrice ?? 0));
      setQuantity('1');
      notify(
        'success',
        operation === PRICE_OPERATION
          ? 'Prix unitaire mis à jour.'
          : `Mouvement de stock enregistré : ${stockOperationPresentation[operation]}.`,
      );
      await loadHistory(part.uuid);
      await onUpdated?.(updatedPart);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Gérer le stock — ${part.name}`}
      subtitle={part.reference}
      onClose={onClose}
      busy={busy}
      className="stock-management-modal"
    >
      <div className="stock-summary-grid mb-4">
        <div className="stock-summary-card">
          <span>En stock</span>
          <strong>{formatStockQuantity(currentPart.quantityOnHand, currentPart.unit)}</strong>
        </div>
        <div className="stock-summary-card">
          <span>Commandée</span>
          <strong>{formatStockQuantity(currentPart.quantityOnOrder, currentPart.unit)}</strong>
        </div>
        <div className="stock-summary-card">
          <span>Coût cumulé utilisé</span>
          <strong>{formatCurrency(currentPart.totalMaintenanceCost ?? 0)}</strong>
        </div>
        <div className="stock-summary-card">
          <span>Valeur du stock actuel</span>
          <strong>
            {formatCurrency(
              Number(currentPart.quantityOnHand ?? 0) * Number(currentPart.unitPrice ?? 0),
            )}
          </strong>
        </div>
      </div>

      {error ? (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      ) : null}

      {permittedOperations.length ? (
        <form className="d-grid gap-3" onSubmit={submit}>
          <label className="form-label mb-0 text-body-secondary">
            Opération
            <select
              className="form-select"
              value={operation}
              onChange={(event) => setOperation(event.target.value)}
            >
              {permittedOperations.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={
                    option.value === STOCK_OPERATIONS.RECEIVE && !currentPart.quantityOnOrder
                  }
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-label mb-0 text-body-secondary">
            Date de l’opération
            <input
              className="form-control"
              type="date"
              max={getCurrentOperationDate()}
              required
              value={performedAt}
              onChange={(event) => setPerformedAt(event.target.value)}
            />
          </label>

          {operation === PRICE_OPERATION ? (
            <label className="form-label mb-0 text-body-secondary">
              Nouveau prix unitaire (€)
              <input
                className="form-control"
                type="number"
                min="0"
                max={MAX_MAINTENANCE_PART_UNIT_PRICE}
                step="0.01"
                required
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
              />
            </label>
          ) : operation === STOCK_OPERATIONS.ADJUST ? (
            <div className="row g-3 justify-content-around text-center">
              {canAdjustOnHand ? (
                <div className="col-sm-5">
                  <label className="form-label mb-0 text-body-secondary">
                    Quantité en stock
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      required
                      value={quantityOnHand}
                      onChange={(event) => setQuantityOnHand(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
              {canAdjustOnOrder ? (
                <div className="col-sm-5">
                  <label className="form-label mb-0 text-body-secondary">
                    Quantité commandée
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      required
                      value={quantityOnOrder}
                      onChange={(event) => setQuantityOnOrder(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <label className="form-label mb-0 text-body-secondary">
              {operation === STOCK_OPERATIONS.RECEIVE ? 'Quantité reçue' : 'Quantité commandée'}
              <input
                className="form-control"
                type="number"
                min="1"
                max={operation === STOCK_OPERATIONS.RECEIVE ? currentPart.quantityOnOrder : 1000000}
                step="1"
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
          )}

          {operation === STOCK_OPERATIONS.RECEIVE && !currentPart.quantityOnOrder ? (
            <p className="alert alert-info mb-0">
              Aucune commande n’est actuellement à réceptionner.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={
              busy || (operation === STOCK_OPERATIONS.RECEIVE && !currentPart.quantityOnOrder)
            }
          >
            {busy
              ? 'Enregistrement…'
              : operation === PRICE_OPERATION
                ? 'Enregistrer le prix'
                : 'Enregistrer le mouvement'}
          </Button>
        </form>
      ) : (
        <p className="alert alert-info">Aucune opération de stock ne vous est autorisée.</p>
      )}

      <h3 className="h6 mt-4">Derniers mouvements</h3>
      {loadingHistory ? (
        <Loader label="Chargement des mouvements de stock" />
      ) : movements.length ? (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opération</th>
                <th>Stock</th>
                <th>Commande</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.uuid}>
                  <td>{formatDate(movement.performedAt)}</td>
                  <td>{stockOperationPresentation[movement.operation] ?? movement.operation}</td>
                  <td>{formatChange(movement.quantityOnHandChange, currentPart.unit)}</td>
                  <td>{formatChange(movement.quantityOnOrderChange, currentPart.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-body-secondary mb-0">Aucun mouvement enregistré.</p>
      )}

      <h3 className="h6 mt-4">Historique des prix</h3>
      {loadingHistory ? (
        <Loader label="Chargement de l’historique des prix" />
      ) : priceHistory.length ? (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ancien prix</th>
                <th>Nouveau prix</th>
                <th>Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {priceHistory.map((entry) => (
                <tr key={entry.uuid}>
                  <td>{formatDate(entry.performedAt)}</td>
                  <td>{formatCurrency(entry.previousUnitPrice)}</td>
                  <td>{formatCurrency(entry.unitPrice)}</td>
                  <td>
                    {entry.changedByUser
                      ? `${entry.changedByUser.firstName} ${entry.changedByUser.lastName}`
                      : 'Utilisateur supprimé'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-body-secondary mb-0">Aucune modification de prix enregistrée.</p>
      )}
    </Modal>
  );
}
