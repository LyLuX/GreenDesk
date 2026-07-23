import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import Modal from '../components/Modal.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';

/** Reusable CRUD screen for reference data and the material catalogue. */
export default function ReferencePage({
  title,
  resource,
  fields,
  columns,
  createPermission,
  updatePermission,
  disablePermission,
  filters = [],
  pagination = false,
  detailPath,
}) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const api = useMemo(() => createReferenceApi(resource), [resource]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterValues, setFilterValues] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState('name');
  const [direction, setDirection] = useState('ASC');
  const [paginationData, setPaginationData] = useState(null);
  const [optionLists, setOptionLists] = useState({});
  const [editing, setEditing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusActionId, setStatusActionId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [statusError, setStatusError] = useState('');

  const load = useCallback(
    async (signal) => {
      setIsLoading(true);
      try {
        const response = await api.list(
          {
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...filterValues,
            ...(pagination ? { page, limit, sort, direction } : {}),
          },
          signal,
        );
        const payload = response.data.data ?? [];
        setRows(Array.isArray(payload) ? payload : (payload.items ?? []));
        setPaginationData(Array.isArray(payload) ? null : (payload.pagination ?? null));
        setLoadError('');
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') setLoadError(getApiErrorMessage(error));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [api, debouncedSearch, direction, filterValues, limit, page, pagination, sort],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const resources = [
      ...new Set([...fields, ...filters].map((field) => field.optionsResource).filter(Boolean)),
    ];
    if (!resources.length) return undefined;
    const controller = new AbortController();
    Promise.all(
      resources.map(async (resourceName) => {
        const response = await createReferenceApi(resourceName).list({}, controller.signal);
        const payload = response.data.data ?? [];
        return [resourceName, Array.isArray(payload) ? payload : (payload.items ?? [])];
      }),
    )
      .then((entries) => setOptionLists(Object.fromEntries(entries)))
      .catch(() => {});
    return () => controller.abort();
  }, [fields, filters]);

  const resetPage = () => setPage(1);
  const selectOptions = (field) =>
    field.options ??
    optionLists[field.optionsResource]?.map((item) => ({ value: item.uuid, label: item.name }));
  const save = async (event) => {
    event.preventDefault();
    setFormError('');
    let values;
    try {
      values = normalizeFormValues(Object.fromEntries(new FormData(event.currentTarget)), fields);
    } catch (error) {
      setFormError(error.message);
      return;
    }
    setIsSaving(true);
    try {
      if (editing?.uuid) await api.update(editing.uuid, values);
      else await api.create(values);
      setEditing(null);
      notify(
        'success',
        `${title.slice(0, -1)} ${editing?.uuid ? 'modifiée' : 'créée'} avec succès.`,
      );
      await load();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };
  const toggle = async (row) => {
    if (row.active && !window.confirm(`Désactiver « ${row.name} » ?`)) return;
    setStatusActionId(row.uuid);
    setStatusError('');
    try {
      await api.setStatus(row.uuid, !row.active);
      notify('success', `${title.slice(0, -1)} ${row.active ? 'désactivée' : 'réactivée'}.`);
      await load();
    } catch (error) {
      setStatusError(getApiErrorMessage(error));
    } finally {
      setStatusActionId(null);
    }
  };
  const emptyMessage = debouncedSearch
    ? `Aucun résultat pour « ${debouncedSearch} ».`
    : 'Aucun élément trouvé.';

  return (
    <main className="app-page">
      <div className="page-header d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Référentiel métier</p>
        </div>
        {hasPermission(createPermission) && (
          <Button
            onClick={() => {
              setFormError('');
              setEditing({});
            }}
          >
            Créer
          </Button>
        )}
      </div>
      <input
        aria-label="Rechercher"
        className="form-control mb-4"
        placeholder="Rechercher"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          resetPage();
        }}
      />
      {filters.length > 0 && (
        <div className="surface mb-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((filter) => (
            <FormField
              key={filter.name}
              label={filter.label}
              name={filter.name}
              options={selectOptions(filter)}
              defaultValue={filterValues[filter.name] ?? ''}
              onChange={(event) => {
                setFilterValues((current) => ({ ...current, [filter.name]: event.target.value }));
                resetPage();
              }}
            />
          ))}
        </div>
      )}
      {pagination && (
        <div className="surface mb-4 flex flex-wrap gap-3 p-3 text-sm">
          <label>
            Trier par{' '}
            <select
              className="form-select d-inline-block ms-1 w-auto"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                resetPage();
              }}
            >
              <option value="name">Nom</option>
              <option value="reference">Référence</option>
              <option value="purchasePrice">Prix d’achat</option>
              <option value="purchaseDate">Date d’achat</option>
              <option value="engineHours">Heures moteur</option>
            </select>
          </label>
          <label>
            Ordre{' '}
            <select
              className="form-select d-inline-block ms-1 w-auto"
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value);
                resetPage();
              }}
            >
              <option value="ASC">Croissant</option>
              <option value="DESC">Décroissant</option>
            </select>
          </label>
          <label>
            Par page{' '}
            <select
              className="form-select d-inline-block ms-1 w-auto"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                resetPage();
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>
      )}
      {isLoading && (
        <p role="status" className="text-body-secondary">
          Chargement…
        </p>
      )}
      {loadError && (
        <div
          role="alert"
          className="alert alert-danger d-flex align-items-center justify-content-between"
        >
          <p className="mb-0">{loadError}</p>
          <Button onClick={() => load()}>Réessayer</Button>
        </div>
      )}
      {statusError && (
        <p role="alert" className="alert alert-danger">
          {statusError}
        </p>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage={emptyMessage}
        actionLoadingId={statusActionId}
        onEdit={hasPermission(updatePermission) ? setEditing : undefined}
        onStatus={hasPermission(disablePermission) ? toggle : undefined}
        onView={detailPath ? (row) => navigate(detailPath(row)) : undefined}
      />
      {paginationData && (
        <div className="mt-4 d-flex flex-wrap align-items-center justify-content-between gap-3 text-body-secondary small">
          <span>
            {paginationData.total} résultat(s), page {paginationData.page} sur{' '}
            {paginationData.totalPages}
          </span>
          <div className="d-flex gap-2">
            <Button
              className="btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Précédent
            </Button>
            <Button
              className="btn-sm"
              disabled={page >= paginationData.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
      <Modal
        open={editing !== null}
        title={editing?.uuid ? `Modifier ${title}` : `Créer ${title}`}
        onClose={() => setEditing(null)}
        busy={isSaving}
      >
        <form className="d-grid gap-3" onSubmit={save}>
          {formError && (
            <p role="alert" className="alert alert-danger mb-0">
              {formError}
            </p>
          )}
          {fields.map((field) => (
            <FormField
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type ?? 'text'}
              step={field.step}
              min={field.min}
              defaultValue={editing?.[field.name] ?? editing?.[field.relation]?.uuid ?? ''}
              required={field.required}
              multiline={field.multiline}
              options={selectOptions(field)}
            />
          ))}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
