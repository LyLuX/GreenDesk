import { useEffect, useState } from 'react';
import client from '../api/client.js';
import Button from '../components/Button.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import Modal from '../components/Modal.jsx';
import useAuth from '../auth/useAuth.js';
import getApiErrorMessage from '../api/get-api-error-message.js';
import useNotification from '../notifications/useNotification.js';

export default function ReferencePage({
  title,
  path,
  fields,
  columns,
  createPermission,
  updatePermission,
  disablePermission,
}) {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () =>
    client
      .get(path, { params: { search } })
      .then(({ data }) => {
        setRows(data.data);
        setError('');
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  useEffect(() => {
    load();
  }, [search]);
  const save = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    Object.keys(values).forEach((key) => {
      if (values[key] === '') delete values[key];
    });
    setSaving(true);
    try {
      if (editing?.uuid) await client.put(`${path}/${editing.uuid}`, values);
      else await client.post(path, values);
      setEditing(null);
      notify('success', 'Enregistrement effectué.');
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (row) => {
    if (row.active && !window.confirm(`Désactiver « ${row.name} » ?`)) return;
    try {
      await client.patch(`${path}/${row.uuid}/status`, { active: !row.active });
      notify('success', 'Statut mis à jour.');
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">Référentiel métier</p>
        </div>
        {hasPermission(createPermission) && <Button onClick={() => setEditing({})}>Créer</Button>}
      </div>
      <input
        className="mb-4 w-full max-w-sm rounded border px-3 py-2"
        placeholder="Rechercher"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {error && (
        <p role="alert" className="mb-3 text-red-700">
          {error}
        </p>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        onEdit={hasPermission(updatePermission) ? setEditing : undefined}
        onStatus={hasPermission(disablePermission) ? toggle : undefined}
      />
      <Modal
        open={editing !== null}
        title={editing?.uuid ? `Modifier ${title}` : `Créer ${title}`}
        onClose={() => setEditing(null)}
      >
        <form className="grid gap-3" onSubmit={save}>
          {fields.map((field) => (
            <FormField
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type ?? 'text'}
              defaultValue={editing?.[field.name] ?? ''}
              required={field.required}
            />
          ))}
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
