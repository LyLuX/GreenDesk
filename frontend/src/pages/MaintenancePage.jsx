import { useCallback, useEffect, useState } from 'react';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createMaintenance, executeMaintenance, listMaintenance } from '../api/maintenance.api.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import Modal from '../components/Modal.jsx';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';
import {
  maintenancePriorityLabels,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
} from '../maintenance/maintenance.labels.js';

const types = ['preventive', 'inspection', 'replacement', 'lubrication', 'cleaning', 'custom'];
const priorities = ['low', 'normal', 'high', 'critical'];
const fields = [
  { name: 'materialUuid', label: 'Matériel', required: true },
  { name: 'title', label: 'Intitulé', required: true },
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

/** Maintenance worklist with filters, creation and execution. */
export default function MaintenancePage() {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [items, setItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState(null);
  const load = useCallback(
    async (signal) => {
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
      }
    },
    [filters],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await createMaintenance(
        normalizeFormValues(Object.fromEntries(new FormData(event.currentTarget)), fields),
      );
      setModal(null);
      notify('success', 'Plan d’entretien créé.');
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };
  const execute = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      await executeMaintenance(modal.uuid, {
        performedAt: data.performedAt,
        engineHours: data.engineHours ? Number(data.engineHours) : null,
        comment: data.comment,
      });
      setModal(null);
      notify('success', 'Entretien enregistré.');
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Maintenance</h1>
          <p className="text-sm text-slate-500">Plans d’entretien préventif</p>
        </div>
        {hasPermission('maintenance.create') && (
          <Button onClick={() => setModal('create')}>Créer</Button>
        )}
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          aria-label="Filtrer par priorité"
          onChange={(event) =>
            setFilters((current) => ({ ...current, priority: event.target.value }))
          }
        >
          <option value="">Toutes priorités</option>
          {priorities.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par statut"
          onChange={(event) =>
            setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))
          }
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
          onChange={(event) =>
            setFilters((current) => ({ ...current, active: event.target.value, page: 1 }))
          }
        >
          <option value="">Actifs et inactifs</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
        <select
          aria-label="Filtrer par type"
          onChange={(event) =>
            setFilters((current) => ({ ...current, maintenanceType: event.target.value }))
          }
        >
          <option value="">Tous types</option>
          {types.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="overflow-x-auto border">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Matériel</th>
              <th>Entretien</th>
              <th>Échéance</th>
              <th>Priorité</th>
              <th>État</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="6">Aucun plan d’entretien.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.uuid}>
                  <td>{item.material?.name}</td>
                  <td>{item.title}</td>
                  <td>{item.nextMaintenanceDate ?? item.nextEngineHours ?? '—'}</td>
                  <td>{maintenancePriorityLabels[item.priority]}</td>
                  <td>{maintenanceStatusLabels[item.status]}</td>
                  <td>
                    {hasPermission('maintenance.execute') && (
                      <Button onClick={() => setModal(item)}>Effectuer</Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="mt-4 flex items-center justify-between">
          <span>
            {pagination.total} plan(s), page {pagination.page} sur {pagination.totalPages}
          </span>
          <div className="space-x-2">
            <Button
              disabled={pagination.page <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: pagination.page - 1 }))}
            >
              Précédent
            </Button>
            <Button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((current) => ({ ...current, page: pagination.page + 1 }))}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
      <Modal
        open={modal === 'create'}
        title="Créer un plan d’entretien"
        onClose={() => setModal(null)}
        busy={saving}
      >
        <form className="grid gap-3" onSubmit={submit}>
          {fields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              options={
                field.name === 'materialUuid'
                  ? materials.map((item) => ({ value: item.uuid, label: item.name }))
                  : field.name === 'maintenanceType'
                    ? types.map((value) => ({ value, label: maintenanceTypeLabels[value] }))
                    : field.name === 'priority'
                      ? priorities.map((value) => ({
                          value,
                          label: maintenancePriorityLabels[value],
                        }))
                      : undefined
              }
            />
          ))}
          <Button type="submit" disabled={saving}>
            Enregistrer
          </Button>
        </form>
      </Modal>
      <Modal
        open={Boolean(modal && modal !== 'create')}
        title="Effectuer l’entretien"
        onClose={() => setModal(null)}
        busy={saving}
      >
        <form className="grid gap-3" onSubmit={execute}>
          <FormField
            label="Date réalisée"
            name="performedAt"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <FormField label="Heures moteur" name="engineHours" type="number" min="0" step="0.1" />
          <FormField label="Commentaire" name="comment" multiline />
          <Button type="submit" disabled={saving}>
            Valider
          </Button>
        </form>
      </Modal>
    </main>
  );
}
