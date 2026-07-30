import ReferencePage from './ReferencePage.jsx';
import { activityStatusFilter } from '../filters/filter-options.js';

/** Category reference-data page. */
export default function CategoriesPage() {
  return (
    <ReferencePage
      title="Catégories"
      resource="categories"
      createPermission="categories.create"
      updatePermission="categories.update"
      deletePermission="categories.delete"
      fields={[
        { name: 'name', label: 'Nom', required: true },
        { name: 'description', label: 'Description' },
      ]}
      columns={[
        { key: 'name', label: 'Nom' },
        { key: 'description', label: 'Description' },
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
