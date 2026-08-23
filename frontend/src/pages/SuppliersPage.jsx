import { activityStatusFilter } from '../filters/filter-options.js';
import ReferencePage from './ReferencePage.jsx';
import fleetPermissions from '../permissions/fleet.permissions.js';

export default function SuppliersPage() {
  return (
    <ReferencePage
      title="Fournisseurs"
      resource="suppliers"
      createPermission={fleetPermissions.suppliers.create}
      updatePermission={fleetPermissions.suppliers.update}
      deletePermission={fleetPermissions.suppliers.delete}
      statusPermission={fleetPermissions.suppliers.status.update}
      statusAction
      fields={[
        { name: 'name', label: 'Nom', required: true },
        { name: 'contactName', label: 'Contact' },
        { name: 'email', label: 'E-mail', type: 'email' },
        { name: 'phone', label: 'Téléphone', type: 'tel' },
        { name: 'notes', label: 'Notes', multiline: true },
      ]}
      columns={[
        { key: 'name', label: 'Nom' },
        { key: 'contactName', label: 'Contact' },
        { key: 'email', label: 'E-mail' },
        { key: 'phone', label: 'Téléphone' },
        {
          key: 'active',
          label: 'Statut',
          render: (value) => (
            <span className={`status-badge ${value ? '' : 'inactive'}`}>
              {value ? 'Actif' : 'Inactif'}
            </span>
          ),
        },
      ]}
      filters={[{ name: 'active', ...activityStatusFilter, clientSide: true }]}
    />
  );
}
