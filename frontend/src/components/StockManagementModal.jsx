import { useCallback, useEffect, useState } from 'react';

import getApiErrorMessage from '../api/get-api-error-message.js';
import {
  listMaintenancePartStockMovements,
  updateMaintenancePartStock,
} from '../api/maintenance.api.js';
import {
  formatStockQuantity,
  STOCK_OPERATIONS,
  stockOperationPresentation,
} from '../inventory/stock-status.js';
import useNotification from '../notifications/useNotification.js';
import { formatDateTime } from '../utils/formatters.js';
import Button from './Button.jsx';
import Loader from './Loader.jsx';
import Modal from './Modal.jsx';

const formatChange = (quantity, unit) => {
  const value = Number(quantity);
  if (!value) return '—';
  return `${value > 0 ? '+' : '−'}${formatStockQuantity(Math.abs(value), unit)}`;
};

/** Shared stock-operation dialog for a maintenance part. */
export default function StockManagementModal({ part, onClose, onUpdated }) {
  const { notify } = useNotification();
  const [currentPart, setCurrentPart] = useState(part);
  const [operation, setOperation] = useState(STOCK_OPERATIONS.ADJUST);
  const [quantity, setQuantity] = useState('1');
  const [quantityOnHand, setQuantityOnHand] = useState('0');
  const [quantityOnOrder, setQuantityOnOrder] = useState('0');
  const [movements, setMovements] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadMovements = useCallback(async (uuid, signal) => {
    setLoadingHistory(true);
    try {
      const response = await listMaintenancePartStockMovements(
        uuid,
        { page: 1, limit: 10 },
        signal,
      );
      setMovements(response.data.data.items ?? []);
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
    setQuantity('1');
    setOperation(STOCK_OPERATIONS.ADJUST);
    setError('');
    const controller = new AbortController();
    loadMovements(part.uuid, controller.signal);
    return () => controller.abort();
  }, [loadMovements, part]);

  if (!part || !currentPart) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const payload =
      operation === STOCK_OPERATIONS.ADJUST
        ? {
            operation,
            quantityOnHand: Number(quantityOnHand),
            quantityOnOrder: Number(quantityOnOrder),
          }
        : { operation, quantity: Number(quantity) };
    setBusy(true);
    setError('');
    try {
      const response = await updateMaintenancePartStock(part.uuid, payload);
      const updatedPart = response.data.data;
      setCurrentPart(updatedPart);
      setQuantityOnHand(String(updatedPart.quantityOnHand));
      setQuantityOnOrder(String(updatedPart.quantityOnOrder));
      setQuantity('1');
      notify(
        'success',
        `Mouvement de stock enregistré : ${stockOperationPresentation[operation]}.`,
      );
      await loadMovements(part.uuid);
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
      </div>

      {error ? (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      ) : null}

      <form className="d-grid gap-3" onSubmit={submit}>
        <label className="form-label mb-0 text-body-secondary">
          Opération
          <select
            className="form-select"
            value={operation}
            onChange={(event) => setOperation(event.target.value)}
          >
            <option value={STOCK_OPERATIONS.ADJUST}>Corriger les quantités</option>
            <option value={STOCK_OPERATIONS.ORDER}>Enregistrer une commande</option>
            <option value={STOCK_OPERATIONS.RECEIVE} disabled={!currentPart.quantityOnOrder}>
              Réceptionner une commande
            </option>
          </select>
        </label>

        {operation === STOCK_OPERATIONS.ADJUST ? (
          <div className="row g-3">
            <div className="col-sm-6">
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
            <div className="col-sm-6">
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

        <Button type="submit" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer le mouvement'}
        </Button>
      </form>

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
                  <td>{formatDateTime(movement.createdAt)}</td>
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
    </Modal>
  );
}
