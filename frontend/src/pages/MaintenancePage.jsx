import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { listMaterialOptions } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import MaintenanceOrderListModal, {
  getOrderListFiltersForDeadline,
} from '../components/MaintenanceOrderListModal.jsx';
import Modal from '../components/Modal.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';
import { activityStatusFilter } from '../filters/filter-options.js';
import {
  maintenanceExecutionTypeLabels,
  maintenancePriorityBadgeClasses,
  maintenancePriorityLabels,
  maintenanceStatusClasses,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
} from '../maintenance/maintenance.labels.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import { getStatusActionButtonClass } from '../utils/status-action.js';
import { formatDate } from '../utils/formatters.js';

const types = Object.keys(maintenanceTypeLabels);
const priorities = Object.keys(maintenancePriorityLabels);
const deadlineStatuses = new Set(Object.keys(maintenanceStatusLabels));
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
const remainingDays = (value) => {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toLocaleString('fr-FR')} ${Math.abs(Number(value)) === 1 ? 'jour' : 'jours'}`;
};

/** Complete maintenance worklist backed by the existing maintenance API. */
export default function MaintenancePage() {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [operations, setOperations] = useState([]);
  const [parts, setParts] = useState([]);
  const [filters, setFilters] = useState(() => {
    const materialUuid = searchParams.get('materialUuid');
    const status = searchParams.get('status');
    return {
      page: 1,
      limit: [5, 10, 25].includes(Number(searchParams.get('limit')))
        ? Number(searchParams.get('limit'))
        : 5,
      active: activityStatusFilter.defaultValue,
      ...(materialUuid ? { materialUuid } : {}),
      ...(deadlineStatuses.has(status) ? { status } : {}),
    };
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [pagination, setPagination] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(5);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [catalogPagination, setCatalogPagination] = useState({});
  const [loadingMoreCatalog, setLoadingMoreCatalog] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [orderListOpen, setOrderListOpen] = useState(false);

  const loadTasks = useCallback(
    async (signal) => {
      setIsLoading(true);
      try {
        const tasks = await listMaintenance(
          {
            ...filters,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
          },
          signal,
        );
        setItems(tasks.data.data?.items ?? []);
        setPagination(tasks.data.data?.pagination ?? null);
        setError('');
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [debouncedSearch, filters],
  );
  useEffect(() => {
    const controller = new AbortController();
    loadTasks(controller.signal);
    return () => controller.abort();
  }, [loadTasks]);
  const loadCatalogs = useCallback(async (signal) => {
    try {
      const [materialList, operationList, partList] = await Promise.all([
        listMaterialOptions({ limit: 25 }, signal),
        listMaintenanceOperations({ limit: 25 }, signal),
        listMaintenanceParts({ limit: 25 }, signal),
      ]);
      const materialPayload = materialList.data.data ?? {};
      const operationPayload = operationList.data.data ?? {};
      const partPayload = partList.data.data ?? {};
      setMaterials(
        Array.isArray(materialPayload) ? materialPayload : (materialPayload.items ?? []),
      );
      setOperations(
        Array.isArray(operationPayload) ? operationPayload : (operationPayload.items ?? []),
      );
      setParts(Array.isArray(partPayload) ? partPayload : (partPayload.items ?? []));
      setCatalogPagination({
        materials: Array.isArray(materialPayload) ? null : (materialPayload.pagination ?? null),
        operations: Array.isArray(operationPayload) ? null : (operationPayload.pagination ?? null),
        parts: Array.isArray(partPayload) ? null : (partPayload.pagination ?? null),
      });
      setCatalogError('');
    } catch (requestError) {
      if (requestError.code !== 'ERR_CANCELED') {
        setCatalogError(getApiErrorMessage(requestError));
      }
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadCatalogs(controller.signal);
    return () => controller.abort();
  }, [loadCatalogs]);
  const loadMoreCatalog = async (catalog) => {
    const current = catalogPagination[catalog];
    if (!current || current.page >= current.totalPages || loadingMoreCatalog) return;
    setLoadingMoreCatalog(catalog);
    try {
      const request = {
        materials: listMaterialOptions,
        operations: listMaintenanceOperations,
        parts: listMaintenanceParts,
      }[catalog];
      const response = await request({ page: current.page + 1, limit: 25 });
      const payload = response.data.data ?? {};
      const setters = {
        materials: setMaterials,
        operations: setOperations,
        parts: setParts,
      };
      setters[catalog]((items) => [...items, ...(payload.items ?? [])]);
      setCatalogPagination((pages) => ({ ...pages, [catalog]: payload.pagination ?? current }));
    } catch (requestError) {
      setCatalogError(getApiErrorMessage(requestError));
    } finally {
      setLoadingMoreCatalog('');
    }
  };
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
      await loadTasks();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const executePlan = async (values, partsAction) => {
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      await executeMaintenance(dialog.item.uuid, {
        performedAt: values.performedAt,
        comment: values.comment,
        partsAction,
      });
      notify(
        'success',
        partsAction === 'skip'
          ? 'Entretien enregistré sans changement de pièce.'
          : 'Entretien enregistré.',
      );
      close();
      await loadTasks();
    } catch (requestError) {
      if (partsAction === 'skip') {
        setDialog({ type: 'execute', item: dialog.item, draft: values });
      }
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  const submitExecutePlan = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await executePlan(values, 'consume');
  };
  const requestExecuteWithoutParts = (event) => {
    const form = event.currentTarget.form;
    if (!form?.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    if (!values.comment?.trim()) {
      setFormError('Un commentaire est obligatoire sans changement de pièce.');
      return;
    }
    setFormError('');
    setDialog({ type: 'executeWithoutPartsConfirmation', item: dialog.item, values });
  };
  const toggle = async (item) => {
    if (busy) return false;
    setBusy(true);
    try {
      await setMaintenanceStatus(item.uuid, !item.active);
      notify('success', 'Statut du plan mis à jour.');
      await loadTasks();
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
      await loadTasks();
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
  const showHistory = (item) => {
    setDialog({ type: 'history', item });
    setHistory([]);
    setHistoryPage(1);
    setHistoryPagination(null);
    setFormError('');
  };
  useEffect(() => {
    if (dialog?.type !== 'history') return undefined;
    const controller = new AbortController();
    maintenanceHistory(
      dialog.item.uuid,
      { page: historyPage, limit: historyLimit },
      controller.signal,
    )
      .then((response) => {
        const payload = response.data.data ?? {};
        setHistory(Array.isArray(payload) ? payload : (payload.items ?? []));
        setHistoryPagination(Array.isArray(payload) ? null : (payload.pagination ?? null));
        setFormError('');
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setFormError(getApiErrorMessage(requestError));
      });
    return () => controller.abort();
  }, [dialog, historyLimit, historyPage]);
  const activeItem = dialog?.item;
  const executionPartCount = activeItem?.parts?.length ?? 0;
  const executeWithPartsLabel =
    executionPartCount === 1
      ? 'Effectuer en changeant la pièce'
      : executionPartCount > 1
        ? 'Effectuer en changeant les pièces'
        : 'Effectuer l’entretien';
  const skippedPartsDescription = activeItem?.parts
    ?.map((part) => `${part.name} × ${part.quantity}`)
    .join(', ');
  return (
    <main className="app-page">
      <div className="page-header mb-3 d-flex flex-wrap align-items-start justify-content-between gap-3">
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
          {hasPermission(maintenancePermissions.plans.create) && (
            <Button onClick={() => setDialog({ type: 'create' })}>Créer un plan</Button>
          )}
        </div>
      </div>
      <FilterPanel
        fields={[
          {
            name: 'search',
            type: 'search',
            ariaLabel: 'Rechercher un plan de maintenance',
            placeholder: 'Plan, matériel ou opération',
            value: search,
            onChange: (value) => {
              setSearch(value);
              setFilters((current) => ({ ...current, page: 1 }));
            },
          },
          {
            name: 'materialUuid',
            type: 'select',
            label: 'Matériel',
            ariaLabel: 'Filtrer par matériel',
            emptyLabel: 'Tous les matériels',
            options: materials.map((item) => ({ value: item.uuid, label: item.name })),
            value: filters.materialUuid ?? '',
            onChange: (value) => setFilter('materialUuid', value),
          },
          {
            name: 'priority',
            type: 'select',
            label: 'Priorité',
            ariaLabel: 'Filtrer par priorité',
            emptyLabel: 'Toutes les priorités',
            options: priorities.map((value) => ({
              value,
              label: maintenancePriorityLabels[value],
            })),
            value: filters.priority ?? '',
            onChange: (value) => setFilter('priority', value),
          },
          {
            name: 'maintenanceType',
            type: 'select',
            label: 'Type',
            ariaLabel: 'Filtrer par type',
            emptyLabel: 'Tous les types',
            options: types.map((value) => ({ value, label: maintenanceTypeLabels[value] })),
            value: filters.maintenanceType ?? '',
            onChange: (value) => setFilter('maintenanceType', value),
          },
          {
            name: 'status',
            type: 'select',
            label: 'Échéance',
            ariaLabel: 'Filtrer par échéance',
            emptyLabel: 'Toutes les échéances',
            options: Object.entries(maintenanceStatusLabels).map(([value, label]) => ({
              value,
              label,
            })),
            value: filters.status ?? '',
            onChange: (value) => setFilter('status', value),
          },
          {
            name: 'active',
            type: 'select',
            ...activityStatusFilter,
            ariaLabel: 'Filtrer par statut',
            value: filters.active ?? '',
            onChange: (value) => setFilter('active', value),
          },
        ]}
      />
      {catalogPagination.materials?.page < catalogPagination.materials?.totalPages && (
        <Button
          className="btn-sm btn-outline-secondary mb-3"
          type="button"
          disabled={Boolean(loadingMoreCatalog)}
          onClick={() => loadMoreCatalog('materials')}
        >
          {loadingMoreCatalog === 'materials' ? 'Chargement…' : 'Charger plus de matériels'}
        </Button>
      )}
      {(error || catalogError) && (
        <div
          role="alert"
          className="alert alert-danger d-flex align-items-center justify-content-between"
        >
          <p className="mb-0">{error || catalogError}</p>
          <Button
            onClick={() => {
              if (error) loadTasks();
              if (catalogError) loadCatalogs();
            }}
          >
            Réessayer
          </Button>
        </div>
      )}
      {isLoading && <Loader label="Chargement des plans de maintenance" />}
      {!isLoading && !error && !catalogError && items.length === 0 && (
        <div role="status" className="alert alert-info text-center">
          <p className="mb-0">Aucun plan d’entretien.</p>
        </div>
      )}
      {!isLoading && items.length > 0 && (
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
              {items.map((item) => (
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
                  <td>{formatDate(item.nextMaintenanceDate)}</td>
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
                        item.active ? (maintenanceStatusClasses[item.status] ?? '') : 'inactive'
                      }`}
                    >
                      {maintenanceStatusLabels[item.status]}
                      {!item.active && ' (inactif)'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex h-100 w-100 flex-wrap align-items-center justify-content-center gap-1">
                      {hasPermission(maintenancePermissions.plans.update) && (
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
                      {hasPermission(maintenancePermissions.plans.update) && (
                        <button
                          aria-label={`${item.active ? 'Désactiver' : 'Activer'} ${item.title}`}
                          className={`btn btn-sm ${getStatusActionButtonClass(
                            item.active,
                          )} flex-fill`}
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmation({ action: 'status', item })}
                        >
                          {item.active ? 'Désactiver' : 'Activer'}
                        </button>
                      )}
                      {hasPermission(maintenancePermissions.plans.execute) && item.active && (
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
                      {hasPermission(maintenancePermissions.plans.delete) && (
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
              ))}
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
        className="maintenance-plan-modal"
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
          <div className="d-flex flex-wrap gap-2">
            {[
              ['materials', 'matériels'],
              ['operations', 'opérations'],
              ['parts', 'pièces'],
            ].map(([catalog, label]) =>
              catalogPagination[catalog]?.page < catalogPagination[catalog]?.totalPages ? (
                <Button
                  className="btn-sm btn-outline-secondary"
                  type="button"
                  disabled={Boolean(loadingMoreCatalog)}
                  onClick={() => loadMoreCatalog(catalog)}
                  key={catalog}
                >
                  {loadingMoreCatalog === catalog ? 'Chargement…' : `Charger plus de ${label}`}
                </Button>
              ) : null,
            )}
          </div>
          <fieldset className="surface d-grid gap-2 p-3">
            <legend className="h6 mb-0">Pièces nécessaires</legend>
            {parts.length === 0 ? (
              <p className="mb-0 text-body-secondary">
                Aucune pièce dans le catalogue. Vous pouvez enregistrer le plan sans pièce.
              </p>
            ) : (
              <div
                className="maintenance-plan-parts d-grid gap-2"
                role="region"
                aria-label="Pièces nécessaires"
                tabIndex={0}
              >
                {parts
                  .filter(
                    (part) =>
                      part.active !== false ||
                      activeItem?.parts?.some((assignedPart) => assignedPart.uuid === part.uuid),
                  )
                  .map((part) => {
                    const assigned = activeItem?.parts?.find((item) => item.uuid === part.uuid);
                    return (
                      <div
                        className="maintenance-plan-part-row d-flex flex-nowrap align-items-center justify-content-between gap-4"
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
                            className="maintenance-plan-quantity form-control form-control-sm"
                            type="number"
                            name={`quantity:${part.uuid}`}
                            min="1"
                            defaultValue={assigned?.quantity ?? 1}
                          />
                        </label>
                      </div>
                    );
                  })}
              </div>
            )}
          </fieldset>
          <Button type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
      {orderListOpen ? (
        <MaintenanceOrderListModal
          open
          initialFilters={getOrderListFiltersForDeadline(filters.status)}
          onClose={() => setOrderListOpen(false)}
        />
      ) : null}
      <Modal
        open={dialog?.type === 'execute'}
        title="Effectuer l’entretien"
        onClose={close}
        busy={busy}
      >
        <form className="d-grid gap-3" onSubmit={submitExecutePlan}>
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
            defaultValue={dialog?.draft?.performedAt ?? new Date().toISOString().slice(0, 10)}
          />
          <FormField
            label="Commentaire"
            name="comment"
            multiline
            defaultValue={dialog?.draft?.comment ?? ''}
          />
          <div className="d-grid gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Validation…' : executeWithPartsLabel}
            </Button>
            {executionPartCount > 0 && (
              <button
                type="button"
                className="btn btn-outline-danger"
                disabled={busy}
                onClick={requestExecuteWithoutParts}
              >
                Effectuer sans changement de pièce
              </button>
            )}
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={dialog?.type === 'executeWithoutPartsConfirmation'}
        title="Effectuer sans changement de pièce"
        description={`Les pièces suivantes ne seront pas retirées du stock : ${skippedPartsDescription}. La prochaine échéance sera néanmoins recalculée.`}
        confirmLabel="Confirmer sans changer les pièces"
        busy={busy}
        onClose={() =>
          !busy && setDialog({ type: 'execute', item: activeItem, draft: dialog?.values ?? {} })
        }
        onConfirm={() => executePlan(dialog.values, 'skip')}
      />
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
          <ul className="maintenance-history-list">
            {history.map((entry) => (
              <li
                className={`py-2 ${
                  entry.executionType === 'withoutPartReplacement'
                    ? 'maintenance-history-without-parts'
                    : ''
                }`}
                key={entry.uuid}
              >
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span>
                    <strong>{formatDate(entry.performedAt)}</strong> ·{' '}
                    {entry.performedByUser
                      ? `${entry.performedByUser.firstName} ${entry.performedByUser.lastName}`
                      : 'Utilisateur supprimé'}
                  </span>
                  {entry.executionType === 'withoutPartReplacement' && (
                    <span className="status-badge maintenance-history-exception">
                      {maintenanceExecutionTypeLabels[entry.executionType]}
                    </span>
                  )}
                </div>
                <br />
                {entry.comment || 'Sans commentaire'}
                {entry.executionType === 'withoutPartReplacement' &&
                  entry.partsSnapshot?.length > 0 && (
                    <small className="d-block text-body-secondary">
                      {entry.partsSnapshot
                        .map((part) => `${part.name} × ${part.quantity}`)
                        .join(', ')}
                    </small>
                  )}
              </li>
            ))}
          </ul>
        )}
        <PaginationControls
          pagination={historyPagination}
          limit={historyLimit}
          itemLabel="entretien(s)"
          onLimitChange={(value) => {
            setHistoryLimit(value);
            setHistoryPage(1);
          }}
          onPageChange={setHistoryPage}
        />
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
