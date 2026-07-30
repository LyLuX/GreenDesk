import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';
import { paginateItems } from '../utils/pagination.js';

/** Reusable CRUD screen for reference data and the material catalogue. */
export default function ReferencePage({
  title,
  resource,
  fields,
  columns,
  createPermission,
  updatePermission,
  disablePermission,
  deletePermission,
  filters = [],
  pagination = true,
  detailPath,
  fileField,
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
  const [limit, setLimit] = useState(5);
  const [sort, setSort] = useState('name');
  const [direction, setDirection] = useState('ASC');
  const [paginationData, setPaginationData] = useState(null);
  const [optionLists, setOptionLists] = useState({});
  const [editing, setEditing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusActionId, setStatusActionId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
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
        if (Array.isArray(payload)) {
          if (pagination) {
            const localPage = paginateItems(payload, page, limit);
            setRows(localPage.items);
            setPaginationData(localPage.pagination);
          } else {
            setRows(payload);
            setPaginationData(null);
          }
        } else {
          setRows(payload.items ?? []);
          setPaginationData(payload.pagination ?? null);
        }
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
        const response = await createReferenceApi(resourceName).list(
          { limit: 'all' },
          controller.signal,
        );
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
    let selectedFile;
    let removeFile = false;
    try {
      const formValues = Object.fromEntries(new FormData(event.currentTarget));
      if (fileField) {
        selectedFile = event.currentTarget.elements.namedItem(fileField.name)?.files?.[0];
        removeFile = formValues[`${fileField.name}Remove`] === 'on';
        delete formValues[fileField.name];
        delete formValues[`${fileField.name}Remove`];
      }
      values = normalizeFormValues(formValues, fields);
    } catch (error) {
      setFormError(error.message);
      return;
    }
    setIsSaving(true);
    try {
      const response = editing?.uuid
        ? await api.update(editing.uuid, values)
        : await api.create(values);
      const savedItem = response.data.data;
      if (!editing?.uuid) setEditing(savedItem);
      if (fileField && selectedFile?.size > 0) {
        await fileField.upload(savedItem.uuid, selectedFile);
      } else if (fileField && removeFile) {
        await fileField.remove(savedItem.uuid);
      }
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
    if (statusActionId) return false;
    setStatusActionId(row.uuid);
    setStatusError('');
    try {
      await api.setStatus(row.uuid, !row.active);
      notify('success', `${title.slice(0, -1)} ${row.active ? 'désactivée' : 'réactivée'}.`);
      await load();
      return true;
    } catch (error) {
      setStatusError(getApiErrorMessage(error));
      return false;
    } finally {
      setStatusActionId(null);
    }
  };
  const remove = async (row) => {
    if (statusActionId) return false;
    setStatusActionId(row.uuid);
    setStatusError('');
    try {
      await api.remove(row.uuid);
      notify('success', `${title.slice(0, -1)} supprimée.`);
      await load();
      return true;
    } catch (error) {
      setStatusError(getApiErrorMessage(error));
      return false;
    } finally {
      setStatusActionId(null);
    }
  };
  const requestStatusChange = (row) => {
    if (!row.active) {
      toggle(row);
      return;
    }
    setConfirmation({ action: 'disable', row });
  };
  const confirmAction = async () => {
    if (!confirmation) return;
    const completed =
      confirmation.action === 'delete'
        ? await remove(confirmation.row)
        : await toggle(confirmation.row);
    if (completed) setConfirmation(null);
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
        <div className="reference-filters surface mb-4 p-3">
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
      {pagination && resource === 'materials' && (
        <div className="reference-sort-controls surface mb-4 p-3 text-sm">
          <label className="form-label mb-0 text-body-secondary">
            Trier par
            <select
              className="form-select"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                resetPage();
              }}
            >
              <option value="name">Nom</option>
              <option value="purchasePrice">Prix d’achat</option>
              <option value="purchaseDate">Date d’achat</option>
            </select>
          </label>
          <label className="form-label mb-0 text-body-secondary">
            Ordre
            <select
              className="form-select"
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
        </div>
      )}
      {isLoading && <Loader label={`Chargement des ${title.toLowerCase()}`} />}
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
        onStatus={
          disablePermission && hasPermission(disablePermission) ? requestStatusChange : undefined
        }
        onDelete={
          deletePermission && hasPermission(deletePermission)
            ? (row) => setConfirmation({ action: 'delete', row })
            : undefined
        }
        onView={detailPath ? (row) => navigate(detailPath(row)) : undefined}
      />
      <PaginationControls
        pagination={paginationData}
        limit={limit}
        itemLabel={`${title.toLowerCase().replace(/s$/, '')}(s)`}
        disabled={isLoading}
        onLimitChange={(value) => {
          setLimit(value);
          resetPage();
        }}
        onPageChange={setPage}
      />
      <Modal
        open={editing !== null}
        title={editing?.uuid ? `Modifier ${title}` : `Créer ${title}`}
        onClose={() => setEditing(null)}
        busy={isSaving}
      >
        <form className="d-grid gap-4" onSubmit={save}>
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
          {fileField && (
            <>
              {editing?.uuid && fileField.hasFile(editing) && fileField.renderPreview?.(editing)}
              <FormField
                label={fileField.label}
                name={fileField.name}
                type="file"
                accept={fileField.accept}
              />
              {editing?.uuid && fileField.hasFile(editing) && (
                <label className="form-check text-body-secondary">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name={`${fileField.name}Remove`}
                  />
                  {fileField.removeLabel}
                </label>
              )}
              {fileField.help && <small className="text-body-secondary">{fileField.help}</small>}
            </>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={
          confirmation?.action === 'delete'
            ? `Supprimer ${title.slice(0, -1).toLowerCase()}`
            : `Désactiver ${title.slice(0, -1).toLowerCase()}`
        }
        description={
          confirmation?.action === 'delete'
            ? `« ${confirmation?.row.name ?? ''} » sera supprimé de la liste.`
            : `« ${confirmation?.row.name ?? ''} » ne sera plus disponible dans les sélections.`
        }
        confirmLabel={confirmation?.action === 'delete' ? 'Supprimer' : 'Désactiver'}
        onClose={() => !statusActionId && setConfirmation(null)}
        onConfirm={confirmAction}
        busy={Boolean(statusActionId)}
      />
    </main>
  );
}
