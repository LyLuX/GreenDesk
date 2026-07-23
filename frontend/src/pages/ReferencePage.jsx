import { useCallback, useEffect, useMemo, useState } from 'react';
import useAuth from '../auth/useAuth.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import Button from '../components/Button.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import Modal from '../components/Modal.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import useNotification from '../notifications/useNotification.js';
import normalizeFormValues from '../utils/normalize-form-values.js';
export default function ReferencePage({
  title,
  resource,
  fields,
  columns,
  createPermission,
  updatePermission,
  disablePermission,
}) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const api = useMemo(() => createReferenceApi(resource), [resource]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
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
        const response = await api.list(debouncedSearch ? { search: debouncedSearch } : {}, signal);
        setRows(response.data.data ?? []);
        setLoadError('');
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') setLoadError(getApiErrorMessage(error));
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [api, debouncedSearch],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
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
    : `Aucun élément trouvé.`;
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">Référentiel métier</p>
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
        className="mb-4 w-full max-w-sm rounded border px-3 py-2"
        placeholder="Rechercher"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {isLoading && <p role="status">Chargement…</p>}
      {loadError && (
        <div role="alert">
          <p>{loadError}</p>
          <Button onClick={() => load()}>Réessayer</Button>
        </div>
      )}
      {statusError && <p role="alert">{statusError}</p>}
      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage={emptyMessage}
        actionLoadingId={statusActionId}
        onEdit={hasPermission(updatePermission) ? setEditing : undefined}
        onStatus={hasPermission(disablePermission) ? toggle : undefined}
      />
      <Modal
        open={editing !== null}
        title={editing?.uuid ? `Modifier ${title}` : `Créer ${title}`}
        onClose={() => setEditing(null)}
        busy={isSaving}
      >
        <form className="grid gap-3" onSubmit={save}>
          {formError && <p role="alert">{formError}</p>}
          {fields.map((field) => (
            <FormField
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type ?? 'text'}
              step={field.step}
              min={field.min}
              defaultValue={editing?.[field.name] ?? ''}
              required={field.required}
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
