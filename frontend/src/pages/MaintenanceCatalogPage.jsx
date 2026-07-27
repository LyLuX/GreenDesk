import { useCallback, useEffect, useMemo, useState } from 'react';

import getApiErrorMessage from '../api/get-api-error-message.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';

/** Reusable full-page CRUD screen for a maintenance catalogue. */
export default function MaintenanceCatalogPage({
  title,
  subtitle,
  singular,
  singularWithArticle,
  fields,
  columns,
  listItems,
  createItem,
  updateItem,
  deleteItem,
}) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

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
    if (!term) return rows;
    return rows.filter((row) =>
      fields.some((field) =>
        String(row[field.name] ?? '')
          .toLocaleLowerCase('fr')
          .includes(term),
      ),
    );
  }, [fields, rows, search]);

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
      notify('success', `${singular} enregistrée.`);
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
        notify('success', `${singular} supprimée.`);
      } else {
        await updateItem(confirmation.row.uuid, { active: !confirmation.row.active });
        notify('success', `${singular} ${confirmation.row.active ? 'désactivée' : 'réactivée'}.`);
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
      <div className="page-header d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {hasPermission('maintenance.create') && (
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
        aria-label={`Rechercher dans ${title.toLocaleLowerCase('fr')}`}
        className="form-control mb-4"
        placeholder="Rechercher"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
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
            search.trim()
              ? `Aucun résultat pour « ${search.trim()} ».`
              : 'Aucun élément enregistré.'
          }
          actionLoadingId={busy ? confirmation?.row.uuid : null}
          onEdit={
            hasPermission('maintenance.update')
              ? (row) => {
                  setFormError('');
                  setEditing(row);
                }
              : undefined
          }
          onStatus={
            hasPermission('maintenance.update')
              ? (row) => setConfirmation({ action: 'status', row })
              : undefined
          }
          onDelete={
            hasPermission('maintenance.delete')
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
          {fields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              defaultValue={editing?.[field.name] ?? field.defaultValue ?? ''}
            />
          ))}
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
            ? `« ${confirmation?.row.name ?? ''} » sera supprimée. Un élément utilisé par un plan ne peut pas être supprimé.`
            : confirmation?.row.active
              ? `« ${confirmation?.row.name ?? ''} » ne sera plus proposée dans les nouveaux plans.`
              : `« ${confirmation?.row.name ?? ''} » sera de nouveau proposée dans les plans.`
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
