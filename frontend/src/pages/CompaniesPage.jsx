import ReferencePage from './ReferencePage.jsx';
import companyPermissions from '../permissions/company.permissions.js';
import { activityStatusFilter } from '../filters/filter-options.js';
import useAuth from '../auth/useAuth.js';

/** Global company directory. Business data remains isolated by the active company. */
export default function CompaniesPage() {
  const { refreshCompanies } = useAuth();
  return (
    <ReferencePage
      title="Sociétés"
      resource="companies"
      createPermission={companyPermissions.create}
      updatePermission={companyPermissions.update}
      deletePermission={companyPermissions.delete}
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
          render: (value) => (
            <span className={`status-badge ${value ? '' : 'inactive'}`}>
              {value ? 'Active' : 'Inactive'}
            </span>
          ),
        },
      ]}
      filters={[{ name: 'active', ...activityStatusFilter }]}
    />
  );
}
