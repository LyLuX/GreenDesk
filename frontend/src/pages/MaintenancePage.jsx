import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import {
  createMaintenance,
  deleteMaintenance,
  executeMaintenance,
  listMaintenance,
  listMaintenanceOperations,
  listMaintenanceParts,
  maintenanceHistory,
  setMaintenanceStatus,
  updateMaintenance,
} from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import MaintenanceOrderListModal from '../components/MaintenanceOrderListModal.jsx';
import Modal from '../components/Modal.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';
import {
  maintenancePriorityBadgeClasses,
  maintenancePriorityLabels,
  maintenanceStatusClasses,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
} from '../maintenance/maintenance.labels.js';

const types = Object.keys(maintenanceTypeLabels);
const priorities = Object.keys(maintenancePriorityLabels);
const baseFields = [
  { name: 'materialUuid', label: 'Matériel', required: true },
  { name: 'operationUuid', label: 'Opération', required: true },
  { name: 'description', label: 'Description spécifique', multiline: true },
  { name: 'priority', label: 'Priorité' },
  {
    name: 'intervalDays',
    label: 'Intervalle (jours)',
    type: 'number',
    valueType: 'number',
    min: '1',
    required: true,
  },
  {
    name: 'lastMaintenanceDate',
    label: 'Dernier entretien',
    type: 'date',
    required: true,
  },
  { name: 'notes', label: 'Notes', multiline: true },
];
const date = (value) =>
  value ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T00:00:00Z`)) : '—';
const remainingDays = (value) => {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toLocaleString('fr-FR')} ${Math.abs(Number(value)) === 1 ? 'jour' : 'jours'}`;
};

/** Complete maintenance worklist backed by the existing maintenance API. */
export default function MaintenancePage() {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [items, setItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [operations, setOperations] = useState([]);
  const [parts, setParts] = useState([]);
  const [filters, setFilters] = useState({ page: 1, limit: 5 });
  const [pagination, setPagination] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [orderListOpen, setOrderListOpen] = useState(false);

  const load = useCallback(
    async (signal) => {
      setIsLoading(true);
      try {
        const [tasks, materialList, operationList, partList] = await Promise.all([
          listMaintenance(filters, signal),
          createReferenceApi('materials').list({ limit: 'all' }, signal),
          listMaintenanceOperations(signal),
          listMaintenanceParts(signal),
        ]);
        setItems(tasks.data.data?.items ?? []);
        setPagination(tasks.data.data?.pagination ?? null);
        setMaterials(materialList.data.data?.items ?? materialList.data.data ?? []);
        setOperations(operationList.data.data ?? []);
        setParts(partList.data.data ?? []);
        setError('');
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [filters],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const close = () => {
    if (!busy) {
      setDialog(null);
      setFormError('');
    }
  };
  const setFilter = (name, value) =>
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  const formOptions = (field) => {
    if (field.name === 'materialUuid')
      return materials.map((item) => ({ value: item.uuid, label: item.name }));
    if (field.name === 'operationUuid')
      return operations
        .filter((item) => item.active !== false || item.uuid === dialog?.item?.operation?.uuid)
        .map((item) => ({
          value: item.uuid,
          label: `${item.name} — ${maintenanceTypeLabels[item.maintenanceType]}`,
        }));
    if (field.name === 'priority')
      return priorities.map((value) => ({ value, label: maintenancePriorityLabels[value] }));
    return undefined;
  };
  const formDefault = (item, field) =>
    item?.[field.name] ??
    (field.name === 'materialUuid'
      ? item?.material?.uuid
      : field.name === 'operationUuid'
        ? item?.operation?.uuid
        : '') ??
    '';
  const savePlan = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      const formData = new FormData(event.currentTarget);
      const payload = normalizeFormValues(Object.fromEntries(formData), baseFields);
      payload.parts = parts
        .filter((part) => formData.has(`part:${part.uuid}`))
        .map((part) => ({
          partUuid: part.uuid,
          quantity: Number(formData.get(`quantity:${part.uuid}`)) || 1,
        }));
      if (dialog.type === 'edit') await updateMaintenance(dialog.item.uuid, payload);
      else await createMaintenance(payload);
      notify(
        'success',
        dialog.type === 'edit' ? 'Plan d’entretien modifié.' : 'Plan d’entretien créé.',
      );
      close();
      await load();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const executePlan = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      await executeMaintenance(dialog.item.uuid, {
        performedAt: values.performedAt,
        comment: values.comment,
      });
      notify('success', 'Entretien enregistré.');
      close();
      await load();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (item) => {
    if (busy) return false;
    setBusy(true);
    try {
      await setMaintenanceStatus(item.uuid, !item.active);
      notify('success', 'Statut du plan mis à jour.');
      await load();
      return true;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item) => {
    if (busy) return false;
    setBusy(true);
    try {
      await deleteMaintenance(item.uuid);
      notify('success', 'Plan d’entretien supprimé.');
      await load();
      return true;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const confirmAction = async () => {
    if (!confirmation) return;
    const completed =
      confirmation.action === 'delete'
        ? await remove(confirmation.item)
        : await toggle(confirmation.item);
    if (completed) setConfirmation(null);
  };
  const showHistory = async (item) => {
    setDialog({ type: 'history', item });
    setHistory([]);
    setFormError('');
    try {
      const response = await maintenanceHistory(item.uuid);
      setHistory(response.data.data ?? []);
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    }
  };
  const activeItem = dialog?.item;
  return (
    <main className="app-page">
      <div className="page-header d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Plans d’entretien préventif</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-brand"
            onClick={() => setOrderListOpen(true)}
          >
            Pièces à commander
          </button>
          <Link className="btn btn-outline-brand" to="/maintenance/operations">
            Gérer les opérations
          </Link>
          <Link className="btn btn-outline-brand" to="/maintenance/parts">
            Gérer les pièces
          </Link>
          {hasPermission('maintenance.create') && (
            <Button onClick={() => setDialog({ type: 'create' })}>Créer un plan</Button>
          )}
        </div>
      </div>
      <div className="surface mb-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <select
          aria-label="Filtrer par matériel"
          className="form-select"
          value={filters.materialUuid ?? ''}
          onChange={(event) => setFilter('materialUuid', event.target.value)}
        >
          <option value="">Tous matériels</option>
          {materials.map((item) => (
            <option key={item.uuid} value={item.uuid}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par priorité"
          className="form-select"
          value={filters.priority ?? ''}
          onChange={(event) => setFilter('priority', event.target.value)}
        >
          <option value="">Toutes priorités</option>
          {priorities.map((value) => (
            <option key={value} value={value}>
              {maintenancePriorityLabels[value]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par type"
          className="form-select"
          value={filters.maintenanceType ?? ''}
          onChange={(event) => setFilter('maintenanceType', event.target.value)}
        >
          <option value="">Tous types</option>
          {types.map((value) => (
            <option key={value} value={value}>
              {maintenanceTypeLabels[value]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par statut"
          className="form-select"
          value={filters.status ?? ''}
          onChange={(event) => setFilter('status', event.target.value)}
        >
          <option value="">Tous statuts</option>
          {Object.entries(maintenanceStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par activité"
          className="form-select"
          value={filters.active ?? ''}
          onChange={(event) => setFilter('active', event.target.value)}
        >
          <option value="">Actifs et inactifs</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>
      {error && (
        <div
          role="alert"
          className="alert alert-danger d-flex align-items-center justify-content-between"
        >
          <p className="mb-0">{error}</p>
          <Button onClick={() => load()}>Réessayer</Button>
        </div>
      )}
      {isLoading ? (
        <Loader label="Chargement des plans de maintenance" />
      ) : (
        <div className="table-shell table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Matériel</th>
                <th>Plan</th>
                <th>Échéance</th>
                <th>Restant</th>
                <th>Priorité</th>
                <th>État</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-5 text-center">
                    Aucun plan d’entretien.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.uuid}>
                    <td>{item.material?.name}</td>
                    <td>
                      <strong>{item.title}</strong>
                      <br />
                      {maintenanceTypeLabels[item.maintenanceType]}
                      {item.parts?.length > 0 && (
                        <small className="d-block text-body-secondary">
                          {item.parts
                            .map((part) => `${part.reference} × ${part.quantity}`)
                            .join(', ')}
                        </small>
                      )}
                    </td>
                    <td>{date(item.nextMaintenanceDate)}</td>
                    <td>{remainingDays(item.remainingDays)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          maintenancePriorityBadgeClasses[item.priority] ?? 'priority-normal'
                        }`}
                      >
                        {maintenancePriorityLabels[item.priority]}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          item.active
                            ? (maintenanceStatusClasses[item.status] ?? 'maintenance-up-to-date')
                            : 'inactive'
                        }`}
                      >
                        {maintenanceStatusLabels[item.status]}
                        {!item.active && ' (inactif)'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex h-100 w-100 flex-wrap align-items-center justify-content-center gap-1">
                        {hasPermission('maintenance.update') && (
                          <button
                            aria-label={`Modifier ${item.title}`}
                            className="btn btn-sm btn-outline-brand flex-fill"
                            type="button"
                            disabled={busy}
                            onClick={() => setDialog({ type: 'edit', item })}
                          >
                            Modifier
                          </button>
                        )}
                        {hasPermission('maintenance.update') && (
                          <button
                            aria-label={`${item.active ? 'Désactiver' : 'Activer'} ${item.title}`}
                            className="btn btn-sm btn-outline-secondary flex-fill"
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmation({ action: 'status', item })}
                          >
                            {item.active ? 'Désactiver' : 'Activer'}
                          </button>
                        )}
                        {hasPermission('maintenance.execute') && item.active && (
                          <button
                            aria-label={`Effectuer ${item.title}`}
                            className="btn btn-sm btn-outline-brand flex-fill"
                            type="button"
                            disabled={busy}
                            onClick={() => setDialog({ type: 'execute', item })}
                          >
                            Effectuer
                          </button>
                        )}
                        <button
                          aria-label={`Voir l’historique de ${item.title}`}
                          className="btn btn-sm btn-outline-brand flex-fill"
                          type="button"
                          disabled={busy}
                          onClick={() => showHistory(item)}
                        >
                          Historique
                        </button>
                        {hasPermission('maintenance.delete') && (
                          <button
                            aria-label={`Supprimer ${item.title}`}
                            className="btn btn-sm btn-outline-danger flex-fill"
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmation({ action: 'delete', item })}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <PaginationControls
        pagination={pagination}
        limit={filters.limit}
        itemLabel="plan(s)"
        disabled={isLoading}
        onLimitChange={(value) => setFilter('limit', value)}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
      />
      <Modal
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        title={dialog?.type === 'edit' ? 'Modifier le plan' : 'Créer un plan'}
        onClose={close}
        busy={busy}
      >
        <form key={activeItem?.uuid ?? 'create'} className="d-grid gap-3" onSubmit={savePlan}>
          {formError && (
            <p role="alert" className="alert alert-danger mb-0">
              {formError}
            </p>
          )}
          {baseFields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              defaultValue={formDefault(activeItem, field)}
              options={formOptions(field)}
            />
          ))}
          <fieldset className="surface d-grid gap-2 p-3">
            <legend className="h6 mb-0">Pièces nécessaires</legend>
            {parts.length === 0 ? (
              <p className="mb-0 text-body-secondary">
                Aucune pièce dans le catalogue. Vous pouvez enregistrer le plan sans pièce.
              </p>
            ) : (
              parts
                .filter(
                  (part) =>
                    part.active !== false ||
                    activeItem?.parts?.some((assignedPart) => assignedPart.uuid === part.uuid),
                )
                .map((part) => {
                  const assigned = activeItem?.parts?.find((item) => item.uuid === part.uuid);
                  return (
                    <div
                      className="d-flex flex-wrap align-items-center justify-content-between gap-2"
                      key={part.uuid}
                    >
                      <label className="form-check mb-0">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          name={`part:${part.uuid}`}
                          defaultChecked={Boolean(assigned)}
                        />
                        <span className="form-check-label">
                          {part.name} — {part.reference}
                        </span>
                      </label>
                      <label className="d-flex align-items-center gap-2">
                        <span className="small text-body-secondary">Quantité</span>
                        <input
                          className="form-control form-control-sm"
                          style={{ width: '6rem' }}
                          type="number"
                          name={`quantity:${part.uuid}`}
                          min="1"
                          defaultValue={assigned?.quantity ?? 1}
                        />
                      </label>
                    </div>
                  );
                })
            )}
          </fieldset>
          <Button type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
      <MaintenanceOrderListModal open={orderListOpen} onClose={() => setOrderListOpen(false)} />
      <Modal
        open={dialog?.type === 'execute'}
        title="Effectuer l’entretien"
        onClose={close}
        busy={busy}
      >
        <form className="d-grid gap-3" onSubmit={executePlan}>
          {formError && (
            <p role="alert" className="alert alert-danger mb-0">
              {formError}
            </p>
          )}
          <FormField
            label="Date réalisée"
            name="performedAt"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <FormField label="Commentaire" name="comment" multiline />
          <Button type="submit" disabled={busy}>
            {busy ? 'Validation…' : 'Valider'}
          </Button>
        </form>
      </Modal>
      <Modal
        open={dialog?.type === 'history'}
        title={`Historique - ${activeItem?.title ?? ''}`}
        onClose={close}
        busy={busy}
      >
        {formError && <p role="alert">{formError}</p>}
        {history.length === 0 && !formError ? (
          <p>Aucun entretien enregistré.</p>
        ) : (
          <ul className="divide-y">
            {history.map((entry) => (
              <li className="py-2" key={entry.uuid}>
                <strong>{date(entry.performedAt)}</strong> ·{' '}
                {entry.performedByUser
                  ? `${entry.performedByUser.firstName} ${entry.performedByUser.lastName}`
                  : 'Utilisateur supprimé'}
                <br />
                {entry.comment || 'Sans commentaire'}
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={
          confirmation?.action === 'delete'
            ? 'Supprimer le plan d’entretien'
            : `${confirmation?.item.active ? 'Désactiver' : 'Activer'} le plan d’entretien`
        }
        description={
          confirmation?.action === 'delete'
            ? `Le plan « ${confirmation?.item.title ?? ''} » sera supprimé de la liste.`
            : confirmation?.item.active
              ? `Le plan « ${confirmation?.item.title ?? ''} » ne générera plus d’échéances.`
              : `Le plan « ${confirmation?.item.title ?? ''} » recommencera à générer des échéances.`
        }
        confirmLabel={
          confirmation?.action === 'delete'
            ? 'Supprimer'
            : confirmation?.item.active
              ? 'Désactiver'
              : 'Activer'
        }
        onClose={() => !busy && setConfirmation(null)}
        onConfirm={confirmAction}
        busy={busy}
        destructive={confirmation?.action === 'delete' || confirmation?.item.active}
      />
    </main>
  );
}
