import {
  createMaintenanceManufacturer,
  deleteMaintenanceManufacturer,
  listMaintenanceManufacturers,
  updateMaintenanceManufacturer,
} from '../api/maintenance.api.js';
import MaintenanceCatalogPage from './MaintenanceCatalogPage.jsx';

const fields = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'notes', label: 'Notes', multiline: true },
];

/** Dedicated maintenance-part manufacturer management page. */
export default function MaintenanceManufacturersPage() {
  return (
    <MaintenanceCatalogPage
      title="Fabricants de pièces"
      subtitle="Fabricants réutilisables dans le catalogue de pièces"
      singular="Fabricant"
      singularWithArticle="le fabricant"
      feminine={false}
      fields={fields}
      columns={[
        { key: 'name', label: 'Nom' },
        { key: 'notes', label: 'Notes' },
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
      listItems={listMaintenanceManufacturers}
      createItem={createMaintenanceManufacturer}
      updateItem={updateMaintenanceManufacturer}
      deleteItem={deleteMaintenanceManufacturer}
    />
  );
}
