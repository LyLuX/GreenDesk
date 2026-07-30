import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { activityStatusFilter } from '../filters/filter-options.js';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';

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
}) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(activityStatusFilter.defaultValue);
  const [editing, setEditing] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const agreement = feminine
    ? { saved: 'enregistrée', deleted: 'supprimée', disabled: 'désactivée', enabled: 'réactivée' }
    : { saved: 'enregistré', deleted: 'supprimé', disabled: 'désactivé', enabled: 'réactivé' };

  const load = useCallback(
    async (signal) => {
      setIsLoading(true);
      try {
        const response = await listItems(signal);
        setRows(response.data.data ?? []);
        setLoadError('');
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') setLoadError(getApiErrorMessage(error));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [listItems],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    return rows.filter((row) => {
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
  }, [active, fields, rows, search]);

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
            onChange: setSearch,
          },
          {
            name: 'active',
            type: 'select',
            ...activityStatusFilter,
            ariaLabel: 'Filtrer par statut',
            value: active,
            onChange: setActive,
          },
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
          rows={filteredRows}
          emptyMessage={
            search.trim() || active
              ? 'Aucun élément ne correspond aux filtres.'
              : 'Aucun élément enregistré.'
          }
          actionLoadingId={busy ? confirmation?.row.uuid : null}
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
