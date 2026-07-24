import { useCallback, useEffect, useState } from 'react';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import { createUser, deleteUser, listUsers, updateUser } from '../api/users.api.js';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import useNotification from '../notifications/useNotification.js';

const emptyUser = () => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  isActive: true,
  roleUuids: [],
});

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Jamais';

/** Administrator workspace for creating and maintaining application users. */
export default function UsersPage() {
  const { notify } = useNotification();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        listUsers(),
        createReferenceApi('roles').list(),
      ]);
      setUsers(usersResponse.data.data ?? []);
      setRoles(rolesResponse.data.data ?? []);
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
    setForm(emptyUser());
    setFormError('');
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      password: '',
      isActive: Boolean(user.isActive),
      roleUuids: user.roles?.map((role) => role.uuid) ?? [],
    });
    setFormError('');
  };

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleRole = (roleUuid) => {
    setForm((current) => ({
      ...current,
      roleUuids: current.roleUuids.includes(roleUuid)
        ? current.roleUuids.filter((value) => value !== roleUuid)
        : [...current.roleUuids, roleUuid],
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError('Le prénom, le nom et l’adresse email sont obligatoires.');
      return;
    }
    if (!editing?.uuid && form.password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (form.password && form.password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      isActive: form.isActive,
      roleUuids: form.roleUuids,
      ...(form.password ? { password: form.password } : {}),
    };
    setSaving(true);
    setFormError('');
    try {
      if (editing?.uuid) await updateUser(editing.uuid, payload);
      else await createUser(payload);
      notify('success', `Utilisateur ${editing?.uuid ? 'mis à jour' : 'créé'} avec succès.`);
      setEditing(null);
      await load();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (user) => {
    if (
      !window.confirm(
        `Supprimer définitivement l’utilisateur « ${user.firstName} ${user.lastName} » ?`,
      )
    )
      return;
    setRemoving(user.uuid);
    try {
      await deleteUser(user.uuid);
      notify('success', 'Utilisateur supprimé.');
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
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">Comptes, accès et rôles de l’application.</p>
        </div>
        <Button onClick={openCreate}>Créer un utilisateur</Button>
      </div>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <Loader label="Chargement des utilisateurs" />
      ) : (
        <div className="table-shell table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôles</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td className="py-5 text-center text-body-secondary" colSpan="5">
                    Aucun utilisateur.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.uuid}>
                    <td>
                      <strong>
                        {user.firstName} {user.lastName}
                      </strong>
                      <span className="d-block small text-body-secondary">{user.email}</span>
                    </td>
                    <td>{user.roles?.map((role) => role.name).join(', ') || 'Aucun rôle'}</td>
                    <td>
                      <span className={`status-badge ${user.isActive ? '' : 'inactive'}`}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>{formatDate(user.lastLoginAt)}</td>
                    <td className="text-nowrap">
                      <button
                        className="btn btn-sm btn-outline-brand me-2"
                        type="button"
                        onClick={() => openEdit(user)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        disabled={removing === user.uuid}
                        onClick={() => remove(user)}
                      >
                        {removing === user.uuid ? 'Suppression…' : 'Supprimer'}
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
        title={editing?.uuid ? 'Modifier un utilisateur' : 'Créer un utilisateur'}
        onClose={() => !saving && setEditing(null)}
        busy={saving}
      >
        <form className="d-grid gap-3" onSubmit={save}>
          {formError && (
            <p className="alert alert-danger mb-0" role="alert">
              {formError}
            </p>
          )}
          <div className="row g-3">
            <div className="col-md-6">
              <FormField
                label="Prénom"
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                required
              />
            </div>
            <div className="col-md-6">
              <FormField
                label="Nom"
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                required
              />
            </div>
          </div>
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            required
          />
          <FormField
            label={editing?.uuid ? 'Nouveau mot de passe' : 'Mot de passe'}
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            minLength="8"
            required={!editing?.uuid}
          />
          <div>
            <p className="form-label mb-2 text-body-secondary">Rôles</p>
            {roles.map((role) => (
              <div className="form-check" key={role.uuid}>
                <input
                  className="form-check-input"
                  id={`role-${role.uuid}`}
                  type="checkbox"
                  checked={form.roleUuids.includes(role.uuid)}
                  onChange={() => toggleRole(role.uuid)}
                />
                <label className="form-check-label" htmlFor={`role-${role.uuid}`}>
                  {role.name}
                  {role.description ? ` — ${role.description}` : ''}
                </label>
              </div>
            ))}
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              id="user-active"
              name="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={updateField}
            />
            <label className="form-check-label" htmlFor="user-active">
              Compte actif
            </label>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
