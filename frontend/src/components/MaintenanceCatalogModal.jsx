import { useState } from 'react';

import {
  createMaintenanceOperation,
  createMaintenancePart,
  deleteMaintenanceOperation,
  deleteMaintenancePart,
  updateMaintenanceOperation,
  updateMaintenancePart,
} from '../api/maintenance.api.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';
import { maintenanceTypeLabels } from '../maintenance/maintenance.labels.js';
import useNotification from '../notifications/useNotification.js';
import Button from './Button.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import FormField from './FormField.jsx';
import Modal from './Modal.jsx';

const operationFields = [
  { name: 'name', label: 'Intitulé réutilisable', required: true },
  {
    name: 'maintenanceType',
    label: 'Type',
    required: true,
    options: Object.entries(maintenanceTypeLabels).map(([value, label]) => ({ value, label })),
  },
  { name: 'description', label: 'Description par défaut', multiline: true },
];
const partFields = [
  { name: 'name', label: 'Désignation', required: true },
  { name: 'manufacturer', label: 'Fabricant' },
  { name: 'reference', label: 'Référence fabricant', required: true },
  { name: 'supplierReference', label: 'Référence fournisseur' },
  { name: 'unit', label: 'Unité', required: true },
];

const formValues = (form) =>
  Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, value || null]));

/** Manages the reusable operation and exact-part catalogues. */
export default function MaintenanceCatalogModal({ open, operations, parts, onClose, onChanged }) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [editing, setEditing] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (!busy) {
      setEditing(null);
      setError('');
      onClose();
    }
  };

  const save = async (event, kind) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const values = formValues(event.currentTarget);
    try {
      if (kind === 'operation') {
        if (editing?.kind === kind) {
          await updateMaintenanceOperation(editing.item.uuid, values);
        } else {
          await createMaintenanceOperation(values);
        }
      } else if (editing?.kind === kind) {
        await updateMaintenancePart(editing.item.uuid, values);
      } else {
        await createMaintenancePart(values);
      }
      notify('success', `${kind === 'operation' ? 'Opération' : 'Pièce'} enregistrée.`);
      setEditing(null);
      event.currentTarget.reset();
      await onChanged();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmation || busy) return;
    setBusy(true);
    setError('');
    try {
      if (confirmation.kind === 'operation') {
        await deleteMaintenanceOperation(confirmation.item.uuid);
      } else {
        await deleteMaintenancePart(confirmation.item.uuid);
      }
      notify('success', `${confirmation.kind === 'operation' ? 'Opération' : 'Pièce'} supprimée.`);
      setConfirmation(null);
      await onChanged();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  };

  const catalogueSection = (kind, title, items, fields) => {
    const isEditing = editing?.kind === kind;
    return (
      <section aria-label={title} className="surface d-grid gap-3 p-3">
        <h3 className="h6 mb-0">{title}</h3>
        {hasPermission(isEditing ? 'maintenance.update' : 'maintenance.create') && (
          <form
            key={isEditing ? editing.item.uuid : `${kind}-create`}
            className="d-grid gap-2"
            onSubmit={(event) => save(event, kind)}
          >
            {fields.map((field) => (
              <FormField
                key={field.name}
                {...field}
                defaultValue={
                  isEditing
                    ? (editing.item[field.name] ?? '')
                    : field.name === 'unit'
                      ? 'pièce'
                      : ''
                }
              />
            ))}
            <div className="d-flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {isEditing ? 'Mettre à jour' : 'Ajouter'}
              </Button>
              {isEditing && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}
        {items.length === 0 ? (
          <p className="mb-0 text-body-secondary">Aucun élément enregistré.</p>
        ) : (
          <ul className="list-group">
            {items.map((item) => (
              <li
                className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2"
                key={item.uuid}
              >
                <span>
                  <strong>{item.name}</strong>
                  {kind === 'operation' ? (
                    <small className="d-block text-body-secondary">
                      {maintenanceTypeLabels[item.maintenanceType]}
                    </small>
                  ) : (
                    <small className="d-block text-body-secondary">
                      {[item.manufacturer, item.reference].filter(Boolean).join(' · ')}
                    </small>
                  )}
                </span>
                <span className="d-flex gap-1">
                  {hasPermission('maintenance.update') && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-brand"
                      onClick={() => setEditing({ kind, item })}
                    >
                      Modifier
                    </button>
                  )}
                  {hasPermission('maintenance.delete') && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setConfirmation({ kind, item })}
                    >
                      Supprimer
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <>
      <Modal open={open} title="Catalogue de maintenance" onClose={close} busy={busy}>
        {error && (
          <p role="alert" className="alert alert-danger">
            {error}
          </p>
        )}
        <div className="d-grid gap-4">
          {catalogueSection('operation', 'Opérations', operations, operationFields)}
          {catalogueSection('part', 'Pièces', parts, partFields)}
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={`Supprimer ${confirmation?.kind === 'operation' ? 'l’opération' : 'la pièce'}`}
        description={`« ${confirmation?.item.name ?? ''} » sera supprimé du catalogue. Un élément utilisé par un plan ne peut pas être supprimé.`}
        confirmLabel="Supprimer"
        onClose={() => !busy && setConfirmation(null)}
        onConfirm={remove}
        busy={busy}
        destructive
      />
    </>
  );
}
