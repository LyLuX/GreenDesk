import { useCallback, useEffect, useState } from 'react';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import Modal from '../components/Modal.jsx';
import useNotification from '../notifications/useNotification.js';

const emptyRole = () => ({ name: '', description: '', permissionUuids: [] });
const rolesApi = createReferenceApi('roles');
const permissionsApi = createReferenceApi('permissions');

/** Administrator workspace for assigning permission codes to application roles. */
export default function RolesPage() {
  const { notify } = useNotification();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRole);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        rolesApi.list(),
        permissionsApi.list(),
      ]);
      setRoles(rolesResponse.data.data ?? []);
      setPermissions(permissionsResponse.data.data ?? []);
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing({});
    setForm(emptyRole());
    setFormError('');
  };

  const openEdit = (role) => {
    setEditing(role);
    setForm({
      name: role.name ?? '',
      description: role.description ?? '',
      permissionUuids: role.permissions?.map((permission) => permission.uuid) ?? [],
    });
    setFormError('');
  };

  const togglePermission = (permissionUuid) => {
    setForm((current) => ({
      ...current,
      permissionUuids: current.permissionUuids.includes(permissionUuid)
        ? current.permissionUuids.filter((value) => value !== permissionUuid)
        : [...current.permissionUuids, permissionUuid],
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim()) {
      setFormError('Le nom du rôle est obligatoire.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        permissionUuids: form.permissionUuids,
      };
      if (editing?.uuid) await rolesApi.update(editing.uuid, payload);
      else await rolesApi.create(payload);
      notify('success', `Rôle ${editing?.uuid ? 'mis à jour' : 'créé'} avec succès.`);
      setEditing(null);
      await load();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role) => {
    if (!window.confirm(`Supprimer le rôle « ${role.name} » ?`)) return;
    setRemoving(role.uuid);
    try {
      await rolesApi.remove(role.uuid);
      notify('success', 'Rôle supprimé.');
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <main className="app-page">
      <div className="page-header d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h1 className="page-title">Rôles</h1>
          <p className="page-subtitle">Attribution des permissions par rôle.</p>
        </div>
        <Button onClick={openCreate}>Créer un rôle</Button>
      </div>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-body-secondary" role="status">
          Chargement des rôles…
        </p>
      ) : (
        <div className="table-shell table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Rôle</th>
                <th>Permissions</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td className="py-5 text-center text-body-secondary" colSpan="3">
                    Aucun rôle.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.uuid}>
                    <td>
                      <strong>{role.name}</strong>
                      <span className="d-block small text-body-secondary">
                        {role.description || 'Sans description'}
                      </span>
                    </td>
                    <td>
                      {role.permissions?.length
                        ? role.permissions.map((permission) => permission.name).join(', ')
                        : 'Aucune permission'}
                    </td>
                    <td className="text-nowrap">
                      <button
                        className="btn btn-sm btn-outline-brand me-2"
                        type="button"
                        onClick={() => openEdit(role)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        disabled={removing === role.uuid}
                        onClick={() => remove(role)}
                      >
                        {removing === role.uuid ? 'Suppression…' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={editing !== null}
        title={editing?.uuid ? 'Modifier un rôle' : 'Créer un rôle'}
        onClose={() => !saving && setEditing(null)}
        busy={saving}
      >
        <form className="d-grid gap-3" onSubmit={save}>
          {formError && (
            <p className="alert alert-danger mb-0" role="alert">
              {formError}
            </p>
          )}
          <FormField
            label="Nom"
            name="name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <FormField
            label="Description"
            name="description"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <div>
            <p className="form-label mb-2 text-body-secondary">Permissions attribuées</p>
            <div className="surface p-3">
              {permissions.map((permission) => (
                <div className="form-check" key={permission.uuid}>
                  <input
                    className="form-check-input"
                    id={`permission-${permission.uuid}`}
                    type="checkbox"
                    checked={form.permissionUuids.includes(permission.uuid)}
                    onChange={() => togglePermission(permission.uuid)}
                  />
                  <label className="form-check-label" htmlFor={`permission-${permission.uuid}`}>
                    {permission.name}
                    {permission.description ? ` — ${permission.description}` : ''}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
