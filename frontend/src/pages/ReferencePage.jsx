import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataTable from '../components/DataTable.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
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
  deletePermission,
  statusAction = false,
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
  const [filterValues, setFilterValues] = useState(() =>
    Object.fromEntries(
      filters
        .filter((filter) => filter.defaultValue !== undefined)
        .map((filter) => [filter.name, filter.defaultValue]),
    ),
  );
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
        const apiFilterValues = Object.fromEntries(
          Object.entries(filterValues).filter(
            ([name]) => !filters.find((filter) => filter.name === name)?.clientSide,
          ),
        );
        const response = await api.list(
          {
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...apiFilterValues,
            ...(pagination ? { page, limit, sort, direction } : {}),
          },
          signal,
        );
        const payload = response.data.data ?? [];
        if (Array.isArray(payload)) {
          const filteredPayload = payload.filter((row) =>
            filters.every(
              (filter) =>
                !filter.clientSide ||
                !filterValues[filter.name] ||
                String(row[filter.name]) === filterValues[filter.name],
            ),
          );
          if (pagination) {
            const localPage = paginateItems(filteredPayload, page, limit);
            setRows(localPage.items);
            setPaginationData(localPage.pagination);
          } else {
            setRows(filteredPayload);
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
      await api.update(row.uuid, { active: !row.active });
      notify('success', `Statut de « ${row.name} » mis à jour.`);
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
      <div className="page-header mb-3 d-flex flex-wrap align-items-start justify-content-between gap-3">
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
      <FilterPanel
        fields={[
          {
            name: 'search',
            type: 'search',
            ariaLabel: `Rechercher dans ${title.toLocaleLowerCase('fr')}`,
            placeholder: 'Rechercher',
            value: search,
            onChange: (value) => {
              setSearch(value);
              resetPage();
            },
          },
          ...filters.map((filter) => ({
            name: filter.name,
            type: 'select',
            label: filter.label,
            ariaLabel: filter.ariaLabel ?? `Filtrer par ${filter.label.toLocaleLowerCase('fr')}`,
            emptyLabel: filter.emptyLabel ?? 'Tous',
            options: selectOptions(filter),
            value: filterValues[filter.name] ?? filter.defaultValue ?? '',
            onChange: (value) => {
              setFilterValues((current) => ({ ...current, [filter.name]: value }));
              resetPage();
            },
          })),
        ]}
      />
      {pagination && resource === 'materials' && (
        <FilterPanel
          ariaLabel="Tri"
          className="small"
          fields={[
            {
              name: 'sort',
              type: 'select',
              label: 'Trier par',
              ariaLabel: 'Trier les matériels par',
              options: [
                { value: 'name', label: 'Nom' },
                { value: 'purchasePrice', label: 'Prix d’achat' },
                { value: 'purchaseDate', label: 'Date d’achat' },
              ],
              value: sort,
              onChange: (value) => {
                setSort(value);
                resetPage();
              },
            },
            {
              name: 'direction',
              type: 'select',
              label: 'Ordre',
              ariaLabel: 'Choisir l’ordre de tri des matériels',
              options: [
                { value: 'ASC', label: 'Croissant' },
                { value: 'DESC', label: 'Décroissant' },
              ],
              value: direction,
              onChange: (value) => {
                setDirection(value);
                resetPage();
              },
            },
          ]}
        />
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
        onStatus={statusAction && hasPermission(updatePermission) ? requestStatusChange : undefined}
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
