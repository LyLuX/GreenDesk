import { useEffect, useRef, useState } from 'react';
import { createMaintenanceIntervention, listMaintenanceParts } from '../api/maintenance.api.js';
import listAllPages from '../api/list-all-pages.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { resolveIdempotencyAttempt } from '../api/idempotency.js';
import useAuth from '../auth/useAuth.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import { getCurrentOperationDate } from '../inventory/operation-date.js';
import { formatStockQuantity, getStockQuantityStep } from '../inventory/stock-status.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import useNotification from '../notifications/useNotification.js';
import { formatCurrency } from '../utils/formatters.js';
import AutocompleteField from './AutocompleteField.jsx';
import Button from './Button.jsx';
import FormField from './FormField.jsx';
import Modal from './Modal.jsx';

const partLabel = (part) =>
  `${part.name} (${part.reference})${part.supplierReference ? ` · ${part.supplierReference}` : ''} — stock : ${formatStockQuantity(part.quantityOnHand, part.unit)}`;
const partKey = (part) => part.uuid;

/** Records an unplanned use of one or more parts for a fixed material. */
export default function MaterialPartUsageModal({ material, onClose, onSaved }) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const canConsume = hasPermission(maintenancePermissions.parts.stock.consume);
  const canReadParts =
    hasPermission(maintenancePermissions.parts.read) ||
    hasPermission(maintenancePermissions.plans.read);
  const [performedAt, setPerformedAt] = useState(getCurrentOperationDate);
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attemptRef = useRef(null);
  const submittingRef = useRef(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (!canConsume || !canReadParts || !debouncedSearch.trim()) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    listAllPages(
      listMaintenanceParts,
      { active: true, search: debouncedSearch.trim() },
      controller.signal,
    )
      .then((items) => {
        if (!controller.signal.aborted)
          setSuggestions(items.filter((part) => Number(part.quantityOnHand) > 0));
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [canConsume, canReadParts, debouncedSearch]);

  if (!canConsume || !canReadParts || !material.active) return null;
  const totalCost = parts.reduce(
    (sum, part) => sum + Number(part.quantity || 0) * Number(part.unitPrice || 0),
    0,
  );
  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!parts.length) {
      setError('Ajoutez au moins une pièce utilisée.');
      return;
    }
    if (!description.trim()) {
      setError('Décrivez l’intervention réalisée.');
      return;
    }
    if (
      parts.some(
        (part) =>
          !Number.isFinite(Number(part.quantity)) ||
          Number(part.quantity) < getStockQuantityStep(part.unit) ||
          Number(part.quantity) > Number(part.quantityOnHand),
      )
    ) {
      setError('Les quantités doivent être positives et ne pas dépasser le stock disponible.');
      return;
    }
    const payload = {
      materialUuid: material.uuid,
      performedAt,
      description: description.trim(),
      parts: parts.map((part) => ({ partUuid: part.uuid, quantity: Number(part.quantity) })),
    };
    const attempt = resolveIdempotencyAttempt(attemptRef.current, {
      operation: 'maintenance.intervention.create',
      body: payload,
    });
    attemptRef.current = attempt;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await createMaintenanceIntervention(payload, attempt.key);
      attemptRef.current = null;
      notify('success', 'Intervention ponctuelle enregistrée.');
      onSaved(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Utiliser des pièces en maintenance"
      subtitle={material.name}
      onClose={onClose}
      busy={busy}
    >
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="d-grid gap-3">
          <p className="mb-0">
            Matériel : <strong>{material.name}</strong>
          </p>
          <FormField
            label="Date de l’intervention"
            type="date"
            required
            max={getCurrentOperationDate()}
            value={performedAt}
            onChange={(event) => setPerformedAt(event.target.value)}
          />
          <FormField
            label="Description de l’intervention"
            multiline
            rows="3"
            required
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <AutocompleteField
            label="Rechercher une pièce par nom ou référence"
            type="search"
            value={search}
            suggestions={suggestions.filter(
              (part) => !parts.some((selected) => selected.uuid === part.uuid),
            )}
            getSuggestionKey={partKey}
            getSuggestionLabel={partLabel}
            loading={loading}
            disabled={parts.length >= 50}
            emptyMessage="Aucune pièce disponible en stock"
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            onSelect={(part) => {
              setParts((current) =>
                current.some((selected) => selected.uuid === part.uuid)
                  ? current
                  : [
                      ...current,
                      {
                        ...part,
                        quantity: Math.min(1, Number(part.quantityOnHand)),
                      },
                    ],
              );
              setSearch('');
            }}
          />
          {parts.length === 0 && (
            <p className="text-body-secondary mb-0">
              Recherchez puis sélectionnez les pièces utilisées.
            </p>
          )}
          {parts.map((part) => (
            <div key={part.uuid} className="surface p-3">
              <strong className="d-block text-break">
                {part.name} ({part.reference})
              </strong>
              <p className="small text-body-secondary mb-2">
                Stock disponible : {formatStockQuantity(part.quantityOnHand, part.unit)} · Prix
                unitaire : {formatCurrency(part.unitPrice)}
              </p>
              <div className="row g-2 align-items-end">
                <div className="col-12 col-sm-7">
                  <FormField
                    label={`Quantité utilisée — ${part.name} (${part.reference})`}
                    type="number"
                    required
                    min={getStockQuantityStep(part.unit)}
                    max={part.quantityOnHand}
                    step={getStockQuantityStep(part.unit)}
                    value={part.quantity}
                    onChange={(event) =>
                      setParts((current) =>
                        current.map((entry) =>
                          entry.uuid === part.uuid
                            ? { ...entry, quantity: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </div>
                <div className="col-12 col-sm-5">
                  <button
                    className="btn btn-outline-danger w-100"
                    type="button"
                    aria-label={`Retirer ${part.name} (${part.reference})`}
                    onClick={() =>
                      setParts((current) => current.filter((entry) => entry.uuid !== part.uuid))
                    }
                  >
                    Retirer
                  </button>
                </div>
              </div>
            </div>
          ))}
          <p className="mb-0">
            Coût total : <strong>{formatCurrency(totalCost)}</strong>
          </p>
          <p className="small text-body-secondary mb-0">
            L’enregistrement crée une intervention ponctuelle et déduit les quantités utilisées du
            stock.
          </p>
          <div className="d-flex gap-2 flex-wrap">
            <Button type="submit" disabled={!parts.length}>
              {busy ? 'Enregistrement…' : 'Enregistrer l’utilisation'}
            </Button>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Annuler
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
