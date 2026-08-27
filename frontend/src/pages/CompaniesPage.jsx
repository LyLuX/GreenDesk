import ReferencePage from './ReferencePage.jsx';
import companyPermissions from '../permissions/company.permissions.js';
import { activityStatusFilter } from '../filters/filter-options.js';
import useAuth from '../auth/useAuth.js';
import { formatDateTime } from '../utils/formatters.js';

/** Global company directory. Business data remains isolated by the active company. */
export default function CompaniesPage() {
  const { hasPermission, refreshCompanies } = useAuth();
  const canReadDeletedCompanies = hasPermission(companyPermissions.deleted.read);
  return (
    <ReferencePage
      title="Sociétés"
      resource="companies"
      createPermission={companyPermissions.create}
      updatePermission={companyPermissions.update}
      deletePermission={companyPermissions.delete}
      deletedUpdatePermission={companyPermissions.deleted.update}
      statusPermission={companyPermissions.status.update}
      statusAction
      onChanged={refreshCompanies}
      fields={[
        { name: 'name', label: 'Nom', required: true },
        { name: 'description', label: 'Description', multiline: true },
      ]}
      columns={[
        { key: 'name', label: 'Nom' },
        { key: 'description', label: 'Description' },
        {
          key: 'active',
          label: 'Statut',
          render: (value, company) => (
            <>
              <span
                className={`status-badge ${
                  company.deletedAt ? 'deleted' : value ? '' : 'inactive'
                }`}
              >
                {company.deletedAt ? 'Supprimée' : value ? 'Active' : 'Inactive'}
              </span>
              {company.deletedAt ? (
                <span className="d-block small mt-1 text-body-secondary fw-lighter fst-italic">
                  {formatDateTime(company.deletedAt)}
                </span>
              ) : null}
            </>
          ),
        },
      ]}
      filters={[
        {
          name: 'active',
          ...activityStatusFilter,
          options: [
            ...activityStatusFilter.options,
            ...(canReadDeletedCompanies ? [{ value: 'deleted', label: 'Supprimées' }] : []),
          ],
          toQuery: (value) =>
            value === 'deleted'
              ? { deleted: true }
              : value
                ? { active: value }
                : canReadDeletedCompanies
                  ? { includeDeleted: true }
                  : {},
        },
      ]}
    />
  );
}
