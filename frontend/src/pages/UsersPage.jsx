import { useCallback, useEffect, useState } from 'react';
import getApiErrorMessage, { getRetryAfterSeconds } from '../api/get-api-error-message.js';
import listAllPages from '../api/list-all-pages.js';
import { createReferenceApi } from '../api/reference.api.js';
import {
  createUser,
  deleteUser,
  listUsers,
  resendUserEmailVerification,
  restoreUser,
  updateUser,
} from '../api/users.api.js';
import useAuth from '../auth/useAuth.js';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import FormField from '../components/FormField.jsx';
import Loader from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import PaginationControls from '../components/PaginationControls.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import TimedProgressButton, {
  createTimedCooldown,
  isTimedCooldownActive,
} from '../components/TimedProgressButton.jsx';
import { activityStatusFilter } from '../filters/filter-options.js';
import useNotification from '../notifications/useNotification.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import { paginateItems } from '../utils/pagination.js';
import { getStatusActionButtonClass } from '../utils/status-action.js';
import { formatDateTime } from '../utils/formatters.js';
import administrationPermissions from '../permissions/administration.permissions.js';
import companyPermissions from '../permissions/company.permissions.js';

const emptyUser = () => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleUuids: [],
  companyUuids: [],
});
const rolesApi = createReferenceApi('roles');
const companiesApi = createReferenceApi('companies');

/** Administrator workspace for creating and maintaining application users. */
export default function UsersPage() {
  const { hasPermission, activeCompany } = useAuth();
  const { notify } = useNotification();
  const canCreate = hasPermission(administrationPermissions.users.create);
  const canUpdate = hasPermission(administrationPermissions.users.update);
  const canUpdateStatus = hasPermission(administrationPermissions.users.status.update);
  const canUpdatePassword = hasPermission(administrationPermissions.users.password.update);
  const canUpdateRoles = hasPermission(administrationPermissions.users.roles.update);
  const canUpdateCompanies = hasPermission(administrationPermissions.users.companies.update);
  const canDelete = hasPermission(administrationPermissions.users.delete);
  const canRestore = hasPermission(administrationPermissions.users.deleted.update);
  const canReadDeletedUsers = hasPermission(administrationPermissions.users.deleted.read);
  const canResendVerification = hasPermission(
    administrationPermissions.users.emailVerification.resend,
  );
  const canReadRoles = hasPermission(administrationPermissions.roles.read);
  const canReadCompanies = hasPermission(companyPermissions.read);
  const canOpenEdit =
    canUpdate ||
    canUpdatePassword ||
    (canUpdateRoles && canReadRoles) ||
    (canUpdateCompanies && canReadCompanies);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [changingStatus, setChangingStatus] = useState(null);
  const [resendingVerification, setResendingVerification] = useState(null);
  const [verificationCooldowns, setVerificationCooldowns] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(activityStatusFilter.defaultValue);
  const [roleUuid, setRoleUuid] = useState('');
  const [pagination, setPagination] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const usersResponse = await listUsers(
          {
            page,
            limit,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(active === 'deleted' ? { deleted: true } : active !== '' ? { active } : {}),
            ...(active === '' && canReadDeletedUsers ? { includeDeleted: true } : {}),
            ...(roleUuid ? { roleUuid } : {}),
          },
          signal,
        );
        const payload = usersResponse.data.data ?? {};
        const normalized = Array.isArray(payload)
          ? paginateItems(
              payload.filter((user) => {
                const term = debouncedSearch.trim().toLocaleLowerCase('fr');
                const matchesSearch =
                  !term ||
                  [user.firstName, user.lastName, user.email]
                    .filter(Boolean)
                    .some((value) => value.toLocaleLowerCase('fr').includes(term));
                const matchesDeleted =
                  active === 'deleted'
                    ? Boolean(user.deletedAt)
                    : active === ''
                      ? true
                      : !user.deletedAt;
                const matchesActive =
                  active === '' || active === 'deleted' || String(user.isActive) === active;
                const matchesRole =
                  !roleUuid || user.roles?.some((role) => role.uuid === roleUuid) === true;
                return matchesSearch && matchesDeleted && matchesActive && matchesRole;
              }),
              page,
              limit,
            )
          : payload;
        setUsers(normalized.items ?? []);
        setPagination(normalized.pagination ?? null);
        setError('');
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [active, canReadDeletedUsers, debouncedSearch, limit, page, roleUuid],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!canReadRoles) return undefined;
    const controller = new AbortController();
    listAllPages(rolesApi.list, {}, controller.signal)
      .then(setRoles)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      });
    return () => controller.abort();
  }, [canReadRoles]);

  useEffect(() => {
    if (!canReadCompanies) return undefined;
    const controller = new AbortController();
    listAllPages(companiesApi.list, {}, controller.signal)
      .then(setCompanies)
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError));
      });
    return () => controller.abort();
  }, [canReadCompanies]);

  const openCreate = () => {
    setEditing({});
    setForm({
      ...emptyUser(),
      companyUuids: activeCompany ? [activeCompany.uuid] : [],
    });
    setFormError('');
  };

  const openEdit = (user) => {
    setRoles((current) => [
      ...current,
      ...(user.roles ?? []).filter((role) => !current.some((item) => item.uuid === role.uuid)),
    ]);
    setEditing(user);
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      password: '',
      roleUuids: user.roles?.map((role) => role.uuid) ?? [],
      companyUuids: user.companies?.map((company) => company.uuid) ?? [],
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

  const toggleCompany = (companyUuid) => {
    setForm((current) => ({
      ...current,
      companyUuids: current.companyUuids.includes(companyUuid)
        ? current.companyUuids.filter((value) => value !== companyUuid)
        : [...current.companyUuids, companyUuid],
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (
      (!editing?.uuid || canUpdate) &&
      (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim())
    ) {
      setFormError('Le prénom, le nom et l’adresse email sont obligatoires.');
      return;
    }
    if (!editing?.uuid && form.password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (canUpdatePassword && form.password && form.password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    const payload = editing?.uuid
      ? {
          ...(canUpdate
            ? {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
              }
            : {}),
          ...(canUpdateRoles && canReadRoles ? { roleUuids: form.roleUuids } : {}),
          ...(canUpdateCompanies && canReadCompanies ? { companyUuids: form.companyUuids } : {}),
          ...(canUpdatePassword && form.password ? { password: form.password } : {}),
        }
      : {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          ...(canUpdateRoles && canReadRoles ? { roleUuids: form.roleUuids } : {}),
          ...(canUpdateCompanies && canReadCompanies ? { companyUuids: form.companyUuids } : {}),
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
    if (removing) return false;
    setRemoving(user.uuid);
    try {
      await deleteUser(user.uuid);
      notify('success', 'Utilisateur supprimé.');
      await load();
      return true;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setRemoving(null);
    }
  };

  const restore = async (user) => {
    if (restoring) return false;
    setRestoring(user.uuid);
    try {
      await restoreUser(user.uuid);
      notify('success', 'Utilisateur restauré avec succès.');
      if (users.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
      return true;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setRestoring(null);
    }
  };

  const toggleStatus = async (user) => {
    if (changingStatus) return false;
    setChangingStatus(user.uuid);
    try {
      await updateUser(user.uuid, { isActive: !user.isActive });
      notify('success', `Utilisateur ${user.isActive ? 'désactivé' : 'réactivé'} avec succès.`);
      await load();
      return true;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      return false;
    } finally {
      setChangingStatus(null);
    }
  };

  const resendVerification = async (user) => {
    if (resendingVerification || isTimedCooldownActive(verificationCooldowns[user.uuid])) return;
    setResendingVerification(user.uuid);
    try {
      const response = await resendUserEmailVerification(user.uuid);
      setVerificationCooldowns((current) => ({
        ...current,
        [user.uuid]: createTimedCooldown(response.data?.data?.resendCooldownSeconds),
      }));
      notify('success', 'Email de vérification envoyé.');
    } catch (requestError) {
      const retryAfterSeconds = getRetryAfterSeconds(requestError);
      if (retryAfterSeconds) {
        setVerificationCooldowns((current) => ({
          ...current,
          [user.uuid]: createTimedCooldown(retryAfterSeconds),
        }));
      }
      setError(getApiErrorMessage(requestError));
    } finally {
      setResendingVerification(null);
    }
  };

  const confirmAction = async () => {
    if (!confirmation) return;
    let completed;
    if (confirmation.action === 'delete') completed = await remove(confirmation.user);
    else if (confirmation.action === 'restore') completed = await restore(confirmation.user);
    else completed = await toggleStatus(confirmation.user);
    if (completed) setConfirmation(null);
  };

  return (
    <main className="app-page">
      <div className="page-header mb-3 d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">Comptes, accès et rôles de l’application.</p>
        </div>
        {canCreate && <Button onClick={openCreate}>Créer un utilisateur</Button>}
      </div>
      <FilterPanel
        fields={[
          {
            name: 'search',
            type: 'search',
            ariaLabel: 'Rechercher un utilisateur',
            placeholder: 'Nom, prénom ou email',
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
            options: [
              ...activityStatusFilter.options,
              ...(canReadDeletedUsers ? [{ value: 'deleted', label: 'Supprimés' }] : []),
            ],
            ariaLabel: 'Filtrer par statut',
            value: active,
            onChange: (value) => {
              setActive(value);
              setPage(1);
            },
          },
          ...(canReadRoles
            ? [
                {
                  name: 'roleUuid',
                  type: 'select',
                  label: 'Rôle',
                  ariaLabel: 'Filtrer par rôle',
                  emptyLabel: 'Tous les rôles',
                  options: roles.map((role) => ({ value: role.uuid, label: role.name })),
                  value: roleUuid,
                  onChange: (value) => {
                    setRoleUuid(value);
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
        <Loader label="Chargement des utilisateurs" />
      ) : (
        <div className="table-shell table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôles</th>
                <th>Sociétés</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagination?.total === 0 ? (
                <tr>
                  <td className="py-5 text-center text-body-secondary" colSpan="6">
                    {search.trim() || active || roleUuid
                      ? 'Aucun utilisateur ne correspond aux filtres.'
                      : 'Aucun utilisateur.'}
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
                      {user.companies?.map((company) => company.name).join(', ') ||
                        'Aucune société'}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          user.deletedAt ? 'deleted' : user.isActive ? '' : 'inactive'
                        }`}
                      >
                        {user.deletedAt ? 'Supprimé' : user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      {user.deletedAt ? (
                        <span className="d-block small mt-1 text-body-secondary fw-lighter fst-italic">
                          {formatDateTime(user.deletedAt)}
                        </span>
                      ) : (
                        <span
                          className={`d-block small mt-1 ${user.emailVerifiedAt ? 'text-success' : 'text-warning-emphasis'}`}
                        >
                          Email {user.emailVerifiedAt ? 'vérifié' : 'à vérifier'}
                        </span>
                      )}
                    </td>
                    <td>{formatDateTime(user.lastLoginAt, 'Jamais')}</td>
                    <td>
                      {user.deletedAt ? (
                        canRestore && (
                          <div className="d-flex h-100 w-100 align-items-center justify-content-center">
                            <button
                              aria-label={`Restaurer ${user.firstName} ${user.lastName}`}
                              className="btn btn-sm btn-outline-activation flex-fill"
                              type="button"
                              disabled={Boolean(restoring)}
                              onClick={() => setConfirmation({ action: 'restore', user })}
                            >
                              {restoring === user.uuid ? 'Restauration…' : 'Restaurer'}
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="d-flex h-100 w-100 flex-wrap align-items-center justify-content-center gap-1">
                          {canOpenEdit && (
                            <button
                              aria-label={`Modifier ${user.firstName} ${user.lastName}`}
                              className="btn btn-sm btn-outline-brand flex-fill"
                              type="button"
                              disabled={Boolean(removing || changingStatus)}
                              onClick={() => openEdit(user)}
                            >
                              Modifier
                            </button>
                          )}
                          {canUpdateStatus && (
                            <button
                              aria-label={`${user.isActive ? 'Désactiver' : 'Activer'} ${
                                user.firstName
                              } ${user.lastName}`}
                              className={`btn btn-sm ${getStatusActionButtonClass(
                                user.isActive,
                              )} flex-fill`}
                              type="button"
                              disabled={Boolean(removing || changingStatus)}
                              onClick={() => setConfirmation({ action: 'status', user })}
                            >
                              {user.isActive ? 'Désactiver' : 'Activer'}
                            </button>
                          )}
                          {canResendVerification && !user.emailVerifiedAt && (
                            <TimedProgressButton
                              aria-label={`Renvoyer l’email de vérification à ${user.firstName} ${user.lastName}`}
                              busy={resendingVerification === user.uuid}
                              busyLabel="Envoi…"
                              className="btn btn-sm btn-outline-secondary flex-fill"
                              cooldown={verificationCooldowns[user.uuid]}
                              cooldownLabel={(seconds) => `Disponible dans ${seconds} s`}
                              type="button"
                              disabled={Boolean(
                                removing || changingStatus || resendingVerification,
                              )}
                              onClick={() => resendVerification(user)}
                            >
                              Renvoyer la vérification
                            </TimedProgressButton>
                          )}
                          {canDelete && (
                            <button
                              aria-label={`Supprimer ${user.firstName} ${user.lastName}`}
                              className="btn btn-sm btn-outline-danger flex-fill"
                              type="button"
                              disabled={Boolean(removing || changingStatus)}
                              onClick={() => setConfirmation({ action: 'delete', user })}
                            >
                              {removing === user.uuid ? 'Suppression…' : 'Supprimer'}
                            </button>
                          )}
                        </div>
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
          itemLabel="utilisateur(s)"
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          onPageChange={setPage}
        />
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
                disabled={Boolean(editing?.uuid && !canUpdate)}
              />
            </div>
            <div className="col-md-6">
              <FormField
                label="Nom"
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                required
                disabled={Boolean(editing?.uuid && !canUpdate)}
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
            disabled={Boolean(editing?.uuid && !canUpdate)}
          />
          {(!editing?.uuid || canUpdatePassword) && (
            <label className="form-label mb-0 text-body-secondary" htmlFor="user-password">
              {editing?.uuid ? 'Nouveau mot de passe' : 'Mot de passe'}
              <PasswordInput
                id="user-password"
                name="password"
                value={form.password}
                onChange={updateField}
                minLength="8"
                required={!editing?.uuid}
                autoComplete="new-password"
              />
            </label>
          )}
          {canUpdateRoles && canReadRoles && (
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
          )}
          {canUpdateCompanies && canReadCompanies && (
            <div>
              <p className="form-label mb-2 text-body-secondary">Sociétés</p>
              {companies.map((company) => (
                <div className="form-check" key={company.uuid}>
                  <input
                    className="form-check-input"
                    id={`company-${company.uuid}`}
                    type="checkbox"
                    checked={form.companyUuids.includes(company.uuid)}
                    onChange={() => toggleCompany(company.uuid)}
                  />
                  <label className="form-check-label" htmlFor={`company-${company.uuid}`}>
                    {company.name}
                  </label>
                </div>
              ))}
            </div>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={
          confirmation?.action === 'delete'
            ? 'Supprimer l’utilisateur'
            : confirmation?.action === 'restore'
              ? 'Restaurer l’utilisateur'
              : `${confirmation?.user.isActive ? 'Désactiver' : 'Activer'} l’utilisateur`
        }
        description={
          confirmation?.action === 'delete'
            ? `Le compte de « ${confirmation?.user.firstName ?? ''} ${
                confirmation?.user.lastName ?? ''
              } » sera supprimé de la liste.`
            : confirmation?.action === 'restore'
              ? `Le compte de « ${confirmation?.user.firstName ?? ''} ${
                  confirmation?.user.lastName ?? ''
                } » sera restauré avec son statut, ses rôles et son état de vérification précédents.`
              : confirmation?.user.isActive
                ? `Le compte de « ${confirmation?.user.firstName ?? ''} ${
                    confirmation?.user.lastName ?? ''
                  } » ne pourra plus se connecter.`
                : `Le compte de « ${confirmation?.user.firstName ?? ''} ${
                    confirmation?.user.lastName ?? ''
                  } » pourra de nouveau se connecter.`
        }
        confirmLabel={
          confirmation?.action === 'delete'
            ? 'Supprimer'
            : confirmation?.action === 'restore'
              ? 'Restaurer'
              : confirmation?.user.isActive
                ? 'Désactiver'
                : 'Activer'
        }
        onClose={() => !removing && !restoring && !changingStatus && setConfirmation(null)}
        onConfirm={confirmAction}
        busy={Boolean(removing || restoring || changingStatus)}
        destructive={
          confirmation?.action === 'delete' ||
          (confirmation?.action === 'status' && confirmation?.user.isActive)
        }
      />
    </main>
  );
}
