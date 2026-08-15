import { useCallback, useEffect, useState } from 'react';

import getApiErrorMessage from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';
import AutocompleteField from '../components/AutocompleteField.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataTable from '../components/DataTable.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import { activityStatusFilter } from '../filters/filter-options.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';
import { paginateItems } from '../utils/pagination.js';

/** Reusable full-page CRUD screen for a maintenance catalogue. */
export default function MaintenanceCatalogPage({
  title,
  subtitle,
  singular,
  singularWithArticle,
  feminine = true,
  fields,
  columns,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  permissions,
  compactTable = false,
  renderRowActions,
  additionalFilters = [],
}) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(activityStatusFilter.defaultValue);
  const [additionalFilterValues, setAdditionalFilterValues] = useState(() =>
    Object.fromEntries(additionalFilters.map((filter) => [filter.name, filter.defaultValue ?? ''])),
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [editing, setEditing] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pagination, setPagination] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const agreement = feminine
    ? { saved: 'enregistrée', deleted: 'supprimée', disabled: 'désactivée', enabled: 'réactivée' }
    : { saved: 'enregistré', deleted: 'supprimé', disabled: 'désactivé', enabled: 'réactivé' };

  const load = useCallback(
    async (signal) => {
      setIsLoading(true);
      try {
        const response = await listItems(
          {
            page,
            limit,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(active !== '' ? { active } : {}),
            ...Object.fromEntries(
              Object.entries(additionalFilterValues).filter(([, value]) => value !== ''),
            ),
          },
          signal,
        );
        const payload = response.data.data ?? {};
        if (Array.isArray(payload)) {
          const term = debouncedSearch.trim().toLocaleLowerCase('fr');
          const filtered = payload.filter((row) => {
            const matchesSearch =
              !term ||
              fields.some((field) =>
                String(row[field.name] ?? '')
                  .toLocaleLowerCase('fr')
                  .includes(term),
              );
            const matchesStatus = active === '' || String(row.active) === active;
            return matchesSearch && matchesStatus;
          });
          const localPage = paginateItems(filtered, page, limit);
          setRows(localPage.items);
          setPagination(localPage.pagination);
        } else {
          setRows(payload.items ?? []);
          setPagination(payload.pagination ?? null);
        }
        setLoadError('');
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') setLoadError(getApiErrorMessage(error));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [active, additionalFilterValues, debouncedSearch, fields, limit, listItems, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      const values = normalizeFormValues(
        Object.fromEntries(new FormData(event.currentTarget)),
        fields,
      );
      if (editing?.uuid) await updateItem(editing.uuid, values);
      else await createItem(values);
      notify('success', `${singular} ${agreement.saved}.`);
      setEditing(null);
      await load();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmation || busy) return;
    setBusy(true);
    setActionError('');
    try {
      if (confirmation.action === 'delete') {
        await deleteItem(confirmation.row.uuid);
        notify('success', `${singular} ${agreement.deleted}.`);
      } else {
        await updateItem(confirmation.row.uuid, { active: !confirmation.row.active });
        notify(
          'success',
          `${singular} ${confirmation.row.active ? agreement.disabled : agreement.enabled}.`,
        );
      }
      setConfirmation(null);
      await load();
    } catch (error) {
      setActionError(getApiErrorMessage(error));
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-page">
      <div className="page-header mb-3 d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {hasPermission(permissions.create) && (
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
              setPage(1);
            },
          },
          {
            name: 'active',
            type: 'select',
            ...activityStatusFilter,
            ariaLabel: 'Filtrer par statut',
            value: active,
            onChange: (value) => {
              setActive(value);
              setPage(1);
            },
          },
          ...additionalFilters.map((filter) => ({
            ...filter,
            type: 'select',
            value: additionalFilterValues[filter.name] ?? '',
            onChange: (value) => {
              setAdditionalFilterValues((current) => ({
                ...current,
                [filter.name]: value,
              }));
              setPage(1);
            },
          })),
        ]}
      />

      {loadError && (
        <div
          role="alert"
          className="alert alert-danger d-flex align-items-center justify-content-between"
        >
          <p className="mb-0">{loadError}</p>
          <Button onClick={() => load()}>Réessayer</Button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="alert alert-danger">
          {actionError}
        </p>
      )}
      {isLoading ? (
        <Loader label={`Chargement de ${title.toLocaleLowerCase('fr')}`} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage={
            search.trim() || active || Object.values(additionalFilterValues).some(Boolean)
              ? 'Aucun élément ne correspond aux filtres.'
              : 'Aucun élément enregistré.'
          }
          actionLoadingId={busy ? confirmation?.row.uuid : null}
          compact={compactTable}
          renderActions={
            renderRowActions && hasPermission(permissions.update)
              ? (row) => renderRowActions(row, { reload: load })
              : undefined
          }
          onEdit={
            hasPermission(permissions.update)
              ? (row) => {
                  setFormError('');
                  setEditing(row);
                }
              : undefined
          }
          onStatus={
            hasPermission(permissions.update)
              ? (row) => setConfirmation({ action: 'status', row })
              : undefined
          }
          onDelete={
            hasPermission(permissions.delete)
              ? (row) => setConfirmation({ action: 'delete', row })
              : undefined
          }
        />
      )}
      {!isLoading && (
        <PaginationControls
          pagination={pagination}
          limit={limit}
          itemLabel={`${singular.toLocaleLowerCase('fr')}(s)`}
          disabled={busy}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          onPageChange={setPage}
        />
      )}

      <Modal
        open={editing !== null}
        title={editing?.uuid ? `Modifier ${singularWithArticle}` : `Créer ${singularWithArticle}`}
        onClose={() => !busy && setEditing(null)}
        busy={busy}
      >
        <form className="d-grid gap-3" onSubmit={save}>
          {formError && (
            <p role="alert" className="alert alert-danger mb-0">
              {formError}
            </p>
          )}
          {fields.map((field) => {
            const { suggestionsFromRecords, ...fieldProps } = field;
            const defaultValue = editing?.[field.name] ?? field.defaultValue ?? '';
            return suggestionsFromRecords ? (
              <AutocompleteField
                key={field.name}
                {...fieldProps}
                defaultValue={defaultValue}
                suggestions={rows.map((row) => row[field.name])}
              />
            ) : (
              <FormField key={field.name} {...fieldProps} defaultValue={defaultValue} />
            );
          })}
          <Button type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={
          confirmation?.action === 'delete'
            ? `Supprimer ${singularWithArticle}`
            : `${confirmation?.row.active ? 'Désactiver' : 'Réactiver'} ${singularWithArticle}`
        }
        description={
          confirmation?.action === 'delete'
            ? `« ${confirmation?.row.name ?? ''} » sera ${agreement.deleted}. Un élément utilisé ne peut pas être supprimé.`
            : confirmation?.row.active
              ? `« ${confirmation?.row.name ?? ''} » ne sera plus ${feminine ? 'proposée' : 'proposé'} dans les nouvelles sélections.`
              : `« ${confirmation?.row.name ?? ''} » sera de nouveau ${feminine ? 'proposée' : 'proposé'} dans les sélections.`
        }
        confirmLabel={
          confirmation?.action === 'delete'
            ? 'Supprimer'
            : confirmation?.row.active
              ? 'Désactiver'
              : 'Réactiver'
        }
        onClose={() => !busy && setConfirmation(null)}
        onConfirm={runConfirmedAction}
        busy={busy}
        destructive={confirmation?.action === 'delete' || confirmation?.row.active}
      />
    </main>
  );
}
