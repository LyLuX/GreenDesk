import { activityStatusFilter } from '../filters/filter-options.js';
import ReferencePage from './ReferencePage.jsx';

export default function SuppliersPage() {
  return (
    <ReferencePage
      title="Fournisseurs"
      resource="suppliers"
      createPermission="suppliers.create"
      updatePermission="suppliers.update"
      deletePermission="suppliers.delete"
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
