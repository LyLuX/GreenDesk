import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import getApiErrorMessage from '../api/get-api-error-message.js';
import listAllPages from '../api/list-all-pages.js';
import { createReferenceApi } from '../api/reference.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EyeIcon from '../components/EyeIcon.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import useNotification from '../notifications/useNotification.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import { paginateItems } from '../utils/pagination.js';
import administrationPermissions from '../permissions/administration.permissions.js';
import {
  getPermissionFamily,
  permissionActionFamilies,
} from '../permissions/permission-action-families.js';

const emptyRole = () => ({ name: '', description: '', permissionUuids: [] });
const rolesApi = createReferenceApi('roles');
const permissionsApi = createReferenceApi('permissions');
const visiblePermissionCount = 6;

function PermissionActionFamilyCheckbox({
  controlsId,
  family,
  label,
  permissionUuids,
  selectedPermissionUuids,
  pinned,
  onPreview,
  onToggle,
  onTogglePreview,
}) {
  const checkboxRef = useRef(null);
  const selectedCount = permissionUuids.filter((uuid) => selectedPermissionUuids.has(uuid)).length;
  const allSelected = selectedCount === permissionUuids.length;
  const partiallySelected = selectedCount > 0 && !allSelected;
  const previewLabel = `${pinned ? 'Masquer' : 'Afficher'} les permissions du groupe « ${label} »`;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  return (
    <div
      className={`permission-action-option ${pinned ? 'is-pinned' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null);
      }}
      onFocus={() => onPreview(family)}
      onMouseEnter={() => onPreview(family)}
      onMouseLeave={() => onPreview(null)}
    >
      <label className="form-label permission-action-selection mb-0">
        <input
          ref={checkboxRef}
          aria-checked={partiallySelected ? 'mixed' : allSelected}
          className="form-check-input"
          type="checkbox"
          checked={allSelected}
          onChange={() => onToggle(permissionUuids)}
        />
        <span className="permission-action-label">
          <span>{label}</span>
          <span className="permission-action-count">
            {selectedCount} sur {permissionUuids.length}
          </span>
        </span>
      </label>
      <button
        aria-controls={controlsId}
        aria-label={previewLabel}
        aria-pressed={pinned}
        className="btn permission-action-preview"
        title={previewLabel}
        type="button"
        onClick={() => onTogglePreview(family)}
      >
        <EyeIcon hidden={pinned} />
      </button>
    </div>
  );
}

const renderPermissionSummary = (permissions = []) => {
  if (!permissions.length) return 'Aucune permission';
  const hiddenCount = Math.max(permissions.length - visiblePermissionCount, 0);

  return (
    <>
      {permissions
        .slice(0, visiblePermissionCount)
        .map((permission) => permission.name)
        .join(', ')}
      {hiddenCount > 0 ? (
        <span
          aria-label={`${hiddenCount} permission${hiddenCount > 1 ? 's' : ''} supplémentaire${hiddenCount > 1 ? 's' : ''}`}
          className="text-body-secondary"
          title={`${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} permission${hiddenCount > 1 ? 's' : ''}`}
        >
          , …
        </span>
      ) : null}
    </>
  );
};

/** Administrator workspace for assigning permission codes to application roles. */
export default function RolesPage() {
  const { hasPermission } = useAuth();
  const { notify } = useNotification();
  const canCreate = hasPermission(administrationPermissions.roles.create);
  const canUpdate = hasPermission(administrationPermissions.roles.update);
  const canDelete = hasPermission(administrationPermissions.roles.delete);
  const canAssignPermissions = hasPermission(administrationPermissions.roles.permissions.update);
  const canReadPermissions = hasPermission(administrationPermissions.permissions.read);
  const canOpenEdit = canUpdate || (canAssignPermissions && canReadPermissions);
  const permissionActionsTitleId = useId();
  const permissionPickerId = useId();
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
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [previewedPermissionFamily, setPreviewedPermissionFamily] = useState(null);
  const [pinnedPermissionFamily, setPinnedPermissionFamily] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const highlightedPermissionFamily = previewedPermissionFamily ?? pinnedPermissionFamily;
  const sortedPermissions = useMemo(
    () =>
      [...permissions].sort((left, right) =>
        left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }),
      ),
    [permissions],
  );
  const permissionFamilyGroups = useMemo(() => {
    const groups = new Map();

    for (const permission of sortedPermissions) {
      const family = getPermissionFamily(permission.name);
      if (!family) continue;
      const permissionUuids = groups.get(family) ?? [];
      permissionUuids.push(permission.uuid);
      groups.set(family, permissionUuids);
    }

    return permissionActionFamilies
      .filter(({ key }) => groups.has(key))
      .map(({ key, label }) => ({ family: key, label, permissionUuids: groups.get(key) }));
  }, [sortedPermissions]);
  const selectedPermissionUuids = useMemo(
    () => new Set(form.permissionUuids),
    [form.permissionUuids],
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
    if (!canReadPermissions) {
      setLoadingPermissions(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoadingPermissions(true);
    listAllPages(permissionsApi.list, {}, controller.signal)
      .then((items) => {
        setPermissions(items);
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPermissions(false);
      });
    return () => controller.abort();
  }, [canReadPermissions]);

  const openCreate = () => {
    setPreviewedPermissionFamily(null);
    setPinnedPermissionFamily(null);
    setEditing({});
    setForm(emptyRole());
    setFormError('');
  };

  const openEdit = (role) => {
    setPreviewedPermissionFamily(null);
    setPinnedPermissionFamily(null);
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

  const togglePermission = (permissionUuid) => {
    setForm((current) => ({
      ...current,
      permissionUuids: current.permissionUuids.includes(permissionUuid)
        ? current.permissionUuids.filter((value) => value !== permissionUuid)
        : [...current.permissionUuids, permissionUuid],
    }));
  };

  const togglePermissionAction = (permissionUuids) => {
    setForm((current) => {
      const actionPermissionUuids = new Set(permissionUuids);
      const allSelected = permissionUuids.every((uuid) => current.permissionUuids.includes(uuid));
      return {
        ...current,
        permissionUuids: allSelected
          ? current.permissionUuids.filter((uuid) => !actionPermissionUuids.has(uuid))
          : [...new Set([...current.permissionUuids, ...permissionUuids])],
      };
    });
  };

  const closeEditor = () => {
    setEditing(null);
    setPreviewedPermissionFamily(null);
    setPinnedPermissionFamily(null);
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    if ((!editing?.uuid || canUpdate) && !form.name.trim()) {
      setFormError('Le nom du rôle est obligatoire.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = editing?.uuid
        ? {
            ...(canUpdate
              ? { name: form.name.trim(), description: form.description.trim() || null }
              : {}),
            ...(canAssignPermissions && canReadPermissions
              ? { permissionUuids: form.permissionUuids }
              : {}),
          }
        : {
            name: form.name.trim(),
            description: form.description.trim() || null,
            ...(canAssignPermissions && canReadPermissions
              ? { permissionUuids: form.permissionUuids }
              : {}),
          };
      if (editing?.uuid) await rolesApi.update(editing.uuid, payload);
      else await rolesApi.create(payload);
      notify('success', `Rôle ${editing?.uuid ? 'mis à jour' : 'créé'} avec succès.`);
      closeEditor();
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
        {canCreate && <Button onClick={openCreate}>Créer un rôle</Button>}
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
          ...(canReadPermissions
            ? [
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
              ]
            : []),
        ]}
      />
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
                    <td>
                      <strong>{role.name}</strong>
                      <span className="d-block small text-body-secondary">
                        {role.description || 'Sans description'}
                      </span>
                    </td>
                    <td>{renderPermissionSummary(role.permissions)}</td>
                    <td>
                      {canOpenEdit && (
                        <button
                          className="btn btn-sm btn-outline-brand me-2"
                          type="button"
                          onClick={() => openEdit(role)}
                        >
                          Modifier
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          type="button"
                          disabled={removing === role.uuid}
                          onClick={() => setRoleToDelete(role)}
                        >
                          {removing === role.uuid ? 'Suppression…' : 'Supprimer'}
                        </button>
                      )}
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
        onClose={() => !saving && closeEditor()}
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
            disabled={Boolean(editing?.uuid && !canUpdate)}
          />
          <FormField
            label="Description"
            name="description"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            disabled={Boolean(editing?.uuid && !canUpdate)}
          />
          {canAssignPermissions && canReadPermissions && (
            <fieldset>
              <legend className="form-label d-flex justify-content-between gap-3">
                <span>Permissions attribuées</span>
                <span className="text-body-secondary fw-normal">
                  {form.permissionUuids.length} sur {sortedPermissions.length}
                </span>
              </legend>
              {!loadingPermissions && permissionFamilyGroups.length > 0 && (
                <section
                  aria-labelledby={permissionActionsTitleId}
                  className="filter-panel permission-action-panel surface mb-3 p-3"
                >
                  <h3 className="permission-action-panel-title" id={permissionActionsTitleId}>
                    Sélection rapide par action
                  </h3>
                  {permissionFamilyGroups.map(({ family, label, permissionUuids }) => (
                    <PermissionActionFamilyCheckbox
                      controlsId={permissionPickerId}
                      family={family}
                      key={family}
                      label={label}
                      permissionUuids={permissionUuids}
                      selectedPermissionUuids={selectedPermissionUuids}
                      pinned={pinnedPermissionFamily === family}
                      onPreview={setPreviewedPermissionFamily}
                      onToggle={togglePermissionAction}
                      onTogglePreview={(selectedFamily) =>
                        setPinnedPermissionFamily((current) =>
                          current === selectedFamily ? null : selectedFamily,
                        )
                      }
                    />
                  ))}
                </section>
              )}
              <div
                id={permissionPickerId}
                className={`permission-picker ${highlightedPermissionFamily ? 'has-permission-highlight' : ''}`}
              >
                {loadingPermissions ? (
                  <Loader label="Chargement des permissions" />
                ) : (
                  sortedPermissions.map((permission) => {
                    const selected = form.permissionUuids.includes(permission.uuid);
                    const permissionFamily = getPermissionFamily(permission.name);
                    const highlighted = permissionFamily === highlightedPermissionFamily;
                    return (
                      <div
                        className={[
                          'permission-option',
                          selected ? 'selected' : '',
                          highlighted ? 'permission-option-highlighted' : '',
                          highlightedPermissionFamily && !highlighted
                            ? 'permission-option-muted'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        key={permission.uuid}
                      >
                        <input
                          className="form-check-input"
                          id={`permission-${permission.uuid}`}
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePermission(permission.uuid)}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`permission-${permission.uuid}`}
                        >
                          <span className="permission-description">
                            {permission.description || permission.name}
                          </span>
                          {permission.description && (
                            <code className="permission-code">{permission.name}</code>
                          )}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </fieldset>
          )}
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
