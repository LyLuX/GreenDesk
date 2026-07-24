import { useCallback, useEffect, useState } from 'react';
import getApiErrorMessage from '../api/get-api-error-message.js';
import {
  createMaintenance,
  deleteMaintenance,
  executeMaintenance,
  listMaintenance,
  maintenanceHistory,
  setMaintenanceStatus,
  updateMaintenance,
} from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import Loader from '../components/Loader.jsx';
import FormField from '../components/FormField.jsx';
import Modal from '../components/Modal.jsx';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';
import {
  maintenancePriorityLabels,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
} from '../maintenance/maintenance.labels.js';

const types = Object.keys(maintenanceTypeLabels);
const priorities = Object.keys(maintenancePriorityLabels);
const baseFields = [
  { name: 'materialUuid', label: 'Matériel', required: true },
  { name: 'title', label: 'Intitulé', required: true },
  { name: 'description', label: 'Description', multiline: true },
  { name: 'maintenanceType', label: 'Type', required: true },
  { name: 'priority', label: 'Priorité' },
  {
    name: 'intervalDays',
    label: 'Intervalle (jours)',
    type: 'number',
    valueType: 'number',
    min: '1',
  },
  {
    name: 'intervalHours',
    label: 'Intervalle (heures)',
    type: 'number',
    valueType: 'number',
    min: '0.1',
    step: '0.1',
  },
  { name: 'lastMaintenanceDate', label: 'Dernier entretien', type: 'date' },
  {
    name: 'lastEngineHours',
    label: 'Heures dernier entretien',
    type: 'number',
    valueType: 'number',
    min: '0',
    step: '0.1',
  },
  { name: 'notes', label: 'Notes', multiline: true },
];
const date = (value) =>
  value ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T00:00:00Z`)) : '—';
const number = (value, suffix = '') =>
  value === null || value === undefined ? '—' : `${Number(value).toLocaleString('fr-FR')}${suffix}`;

/** Complete maintenance worklist backed by the existing maintenance API. */
export default function MaintenancePage() {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [items, setItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [filters, setFilters] = useState({ page: 1, limit: 25 });
  const [pagination, setPagination] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal) => {
      setIsLoading(true);
      try {
        const [tasks, materialList] = await Promise.all([
          listMaintenance(filters, signal),
          createReferenceApi('materials').list({}, signal),
        ]);
        setItems(tasks.data.data?.items ?? []);
        setPagination(tasks.data.data?.pagination ?? null);
        setMaterials(materialList.data.data?.items ?? materialList.data.data ?? []);
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
    if (field.name === 'maintenanceType')
      return types.map((value) => ({ value, label: maintenanceTypeLabels[value] }));
    if (field.name === 'priority')
      return priorities.map((value) => ({ value, label: maintenancePriorityLabels[value] }));
    return undefined;
  };
  const formDefault = (item, field) =>
    item?.[field.name] ?? (field.name === 'materialUuid' ? item?.material?.uuid : '') ?? '';
  const savePlan = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      const payload = normalizeFormValues(
        Object.fromEntries(new FormData(event.currentTarget)),
        baseFields,
      );
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
      if (dialog.item.intervalHours && !values.engineHours)
        throw new Error('Les heures moteur sont obligatoires pour ce plan.');
      await executeMaintenance(dialog.item.uuid, {
        performedAt: values.performedAt,
        engineHours: values.engineHours ? Number(values.engineHours) : null,
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
    if (!window.confirm(`${item.active ? 'Désactiver' : 'Activer'} « ${item.title} » ?`)) return;
    setBusy(true);
    try {
      await setMaintenanceStatus(item.uuid, !item.active);
      notify('success', 'Statut du plan mis à jour.');
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item) => {
    if (!window.confirm(`Supprimer définitivement le plan « ${item.title} » ?`)) return;
    setBusy(true);
    try {
      await deleteMaintenance(item.uuid);
      notify('success', 'Plan d’entretien supprimé.');
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
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
        {hasPermission('maintenance.create') && (
          <Button onClick={() => setDialog({ type: 'create' })}>Créer</Button>
        )}
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
                <th>Échéances</th>
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
                    </td>
                    <td>
                      Date : {date(item.nextMaintenanceDate)}
                      <br />
                      Compteur : {number(item.nextEngineHours, ' h')}
                    </td>
                    <td>
                      {number(item.remainingDays, ' jours')}
                      <br />
                      {number(item.remainingEngineHours, ' h')}
                    </td>
                    <td>
                      <span className="status-badge">
                        {maintenancePriorityLabels[item.priority]}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${item.active ? '' : 'inactive'}`}>
                        {maintenanceStatusLabels[item.status]}
                        {!item.active && ' (inactif)'}
                      </span>
                    </td>
                    <td className="d-flex flex-wrap gap-1">
                      {hasPermission('maintenance.update') && (
                        <Button disabled={busy} onClick={() => setDialog({ type: 'edit', item })}>
                          Modifier
                        </Button>
                      )}
                      {hasPermission('maintenance.update') && (
                        <Button disabled={busy} onClick={() => toggle(item)}>
                          {item.active ? 'Désactiver' : 'Activer'}
                        </Button>
                      )}
                      {hasPermission('maintenance.execute') && item.active && (
                        <Button
                          disabled={busy}
                          onClick={() => setDialog({ type: 'execute', item })}
                        >
                          Effectuer
                        </Button>
                      )}
                      <Button disabled={busy} onClick={() => showHistory(item)}>
                        Historique
                      </Button>
                      {hasPermission('maintenance.delete') && (
                        <Button disabled={busy} onClick={() => remove(item)}>
                          Supprimer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {pagination && (
        <div className="mt-4 d-flex flex-wrap align-items-center justify-content-between gap-3 text-body-secondary small">
          <span>
            {pagination.total} plan(s), page {pagination.page} sur {pagination.totalPages}
          </span>
          <label>
            Par page{' '}
            <select
              className="form-select d-inline-block ms-1 w-auto"
              value={filters.limit}
              onChange={(event) => setFilter('limit', Number(event.target.value))}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>
          <div className="d-flex gap-2">
            <Button
              disabled={isLoading || pagination.page <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
            >
              Précédent
            </Button>
            <Button
              disabled={isLoading || pagination.page >= pagination.totalPages}
              onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
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
          <Button type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
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
          <FormField
            label="Heures moteur"
            name="engineHours"
            type="number"
            min={activeItem?.material?.engineHours ?? 0}
            step="0.1"
            required={Boolean(activeItem?.intervalHours)}
            defaultValue={activeItem?.material?.engineHours ?? activeItem?.lastEngineHours ?? ''}
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
                {number(entry.engineHours, ' h')} · {entry.comment || 'Sans commentaire'}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </main>
  );
}
