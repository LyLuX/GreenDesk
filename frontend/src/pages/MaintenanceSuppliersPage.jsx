import {
  createMaintenanceSupplier,
  deleteMaintenanceSupplier,
  listMaintenanceSuppliers,
  updateMaintenanceSupplier,
} from '../api/maintenance.api.js';
import MaintenanceCatalogPage from './MaintenanceCatalogPage.jsx';

const fields = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'contactName', label: 'Contact' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'phone', label: 'Téléphone', type: 'tel' },
  { name: 'notes', label: 'Notes', multiline: true },
];

/** Dedicated maintenance-supplier management page. */
export default function MaintenanceSuppliersPage() {
  return (
    <MaintenanceCatalogPage
      title="Fournisseurs"
      subtitle="Fournisseurs disponibles pour les pièces de maintenance"
      singular="Fournisseur"
      singularWithArticle="le fournisseur"
      feminine={false}
      fields={fields}
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
      listItems={listMaintenanceSuppliers}
      createItem={createMaintenanceSupplier}
      updateItem={updateMaintenanceSupplier}
      deleteItem={deleteMaintenanceSupplier}
    />
  );
}
