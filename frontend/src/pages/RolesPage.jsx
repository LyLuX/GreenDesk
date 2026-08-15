import { useCallback, useEffect, useMemo, useState } from 'react';
import getApiErrorMessage from '../api/get-api-error-message.js';
import { createReferenceApi } from '../api/reference.api.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import useNotification from '../notifications/useNotification.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import { paginateItems } from '../utils/pagination.js';

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
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [search, setSearch] = useState('');
  const [permissionUuid, setPermissionUuid] = useState('');
  const [pagination, setPagination] = useState(null);
  const [permissionsPagination, setPermissionsPagination] = useState(null);
  const [loadingMorePermissions, setLoadingMorePermissions] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const sortedPermissions = useMemo(
    () =>
      [...permissions].sort((left, right) =>
        left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }),
      ),
    [permissions],
  );

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const rolesResponse = await rolesApi.list(
          {
            page,
            limit,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(permissionUuid ? { permissionUuid } : {}),
          },
          signal,
        );
        const payload = rolesResponse.data.data ?? {};
        const normalized = Array.isArray(payload)
          ? paginateItems(
              payload.filter((role) => {
                const term = debouncedSearch.trim().toLocaleLowerCase('fr');
                const matchesSearch =
                  !term ||
                  [role.name, role.description]
                    .filter(Boolean)
                    .some((value) => value.toLocaleLowerCase('fr').includes(term));
                const matchesPermission =
                  !permissionUuid ||
                  role.permissions?.some((permission) => permission.uuid === permissionUuid) ===
                    true;
                return matchesSearch && matchesPermission;
              }),
              page,
              limit,
            )
          : payload;
        setRoles(normalized.items ?? []);
        setPagination(normalized.pagination ?? null);
        setError('');
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [debouncedSearch, limit, page, permissionUuid],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    permissionsApi
      .list({ limit: 25 }, controller.signal)
      .then((response) => {
        const payload = response.data.data ?? {};
        setPermissions(Array.isArray(payload) ? payload : (payload.items ?? []));
        setPermissionsPagination(Array.isArray(payload) ? null : (payload.pagination ?? null));
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      });
    return () => controller.abort();
  }, []);

  const openCreate = () => {
    setEditing({});
    setForm(emptyRole());
    setFormError('');
  };

  const openEdit = (role) => {
    setPermissions((current) => [
      ...current,
      ...(role.permissions ?? []).filter(
        (permission) => !current.some((item) => item.uuid === permission.uuid),
      ),
    ]);
    setEditing(role);
    setForm({
      name: role.name ?? '',
      description: role.description ?? '',
      permissionUuids: role.permissions?.map((permission) => permission.uuid) ?? [],
    });
    setFormError('');
  };

  const loadMorePermissions = async () => {
    if (
      !permissionsPagination ||
      permissionsPagination.page >= permissionsPagination.totalPages ||
      loadingMorePermissions
    )
      return;
    setLoadingMorePermissions(true);
    try {
      const response = await permissionsApi.list({
        page: permissionsPagination.page + 1,
        limit: 25,
      });
      const payload = response.data.data ?? {};
      setPermissions((current) => [...current, ...(payload.items ?? [])]);
      setPermissionsPagination(payload.pagination ?? permissionsPagination);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingMorePermissions(false);
    }
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
    if (removing) return false;
    setRemoving(role.uuid);
    try {
      await rolesApi.remove(role.uuid);
      notify('success', 'Rôle supprimé.');
      await load();
      return true;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setRemoving(null);
    }
  };
  return (
    <main className="app-page">
      <div className="page-header mb-3 d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h1 className="page-title">Rôles</h1>
          <p className="page-subtitle">Attribution des permissions par rôle.</p>
        </div>
        <Button onClick={openCreate}>Créer un rôle</Button>
      </div>
      <FilterPanel
        fields={[
          {
            name: 'search',
            type: 'search',
            ariaLabel: 'Rechercher un rôle',
            placeholder: 'Nom ou description',
            value: search,
            onChange: (value) => {
              setSearch(value);
              setPage(1);
            },
          },
          {
            name: 'permissionUuid',
            type: 'select',
            label: 'Permission',
            ariaLabel: 'Filtrer par permission',
            emptyLabel: 'Toutes les permissions',
            options: sortedPermissions.map((permission) => ({
              value: permission.uuid,
              label: permission.name,
            })),
            value: permissionUuid,
            onChange: (value) => {
              setPermissionUuid(value);
              setPage(1);
            },
          },
        ]}
      />
      {permissionsPagination?.page < permissionsPagination?.totalPages && (
        <Button
          className="btn-sm btn-outline-secondary mb-3"
          type="button"
          disabled={loadingMorePermissions}
          onClick={loadMorePermissions}
        >
          {loadingMorePermissions ? 'Chargement…' : 'Charger plus de permissions'}
        </Button>
      )}
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <Loader label="Chargement des rôles" />
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
              {pagination?.total === 0 ? (
                <tr>
                  <td className="py-5 text-center text-body-secondary" colSpan="3">
                    {search.trim() || permissionUuid
                      ? 'Aucun rôle ne correspond aux filtres.'
                      : 'Aucun rôle.'}
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.uuid}>
                    <td className="text-nowrap">
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
                        className="btn btn-sm btn-outline-danger"
                        type="button"
                        disabled={removing === role.uuid}
                        onClick={() => setRoleToDelete(role)}
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
      {!loading && (
        <PaginationControls
          pagination={pagination}
          limit={limit}
          itemLabel="rôle(s)"
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          onPageChange={setPage}
        />
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
          <fieldset>
            <legend className="form-label d-flex justify-content-between gap-3">
              <span>Permissions attribuées</span>
              <span className="text-body-secondary fw-normal">
                {form.permissionUuids.length} sur {sortedPermissions.length}
              </span>
            </legend>
            <div className="permission-picker">
              {sortedPermissions.map((permission) => {
                const selected = form.permissionUuids.includes(permission.uuid);
                return (
                  <div
                    className={`permission-option ${selected ? 'selected' : ''}`}
                    key={permission.uuid}
                  >
                    <input
                      className="form-check-input"
                      id={`permission-${permission.uuid}`}
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePermission(permission.uuid)}
                    />
                    <label className="form-check-label" htmlFor={`permission-${permission.uuid}`}>
                      <span className="permission-description">
                        {permission.description || permission.name}
                      </span>
                      {permission.description && (
                        <code className="permission-code">{permission.name}</code>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
            {permissionsPagination?.page < permissionsPagination?.totalPages && (
              <Button
                className="btn-sm btn-outline-secondary mt-2"
                type="button"
                disabled={loadingMorePermissions}
                onClick={loadMorePermissions}
              >
                {loadingMorePermissions ? 'Chargement…' : 'Charger plus de permissions'}
              </Button>
            )}
          </fieldset>
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(roleToDelete)}
        title="Supprimer le rôle"
        description={`Le rôle « ${roleToDelete?.name ?? ''} » sera supprimé de la liste.`}
        confirmLabel="Supprimer"
        onClose={() => !removing && setRoleToDelete(null)}
        onConfirm={async () => {
          if (roleToDelete && (await remove(roleToDelete))) setRoleToDelete(null);
        }}
        busy={Boolean(removing)}
      />
    </main>
  );
}
