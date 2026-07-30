import {
  createMaintenanceOperation,
  deleteMaintenanceOperation,
  listMaintenanceOperations,
  updateMaintenanceOperation,
} from '../api/maintenance.api.js';
import { maintenanceTypeLabels } from '../maintenance/maintenance.labels.js';
import maintenancePermissions from '../maintenance/maintenance.permissions.js';
import MaintenanceCatalogPage from './MaintenanceCatalogPage.jsx';

const fields = [
  { name: 'name', label: 'Désignation', required: true, suggestionsFromRecords: true },
  {
    name: 'maintenanceType',
    label: 'Type',
    required: true,
    options: Object.entries(maintenanceTypeLabels).map(([value, label]) => ({ value, label })),
  },
  { name: 'description', label: 'Description par défaut', multiline: true },
];

/** Dedicated reusable maintenance-operation management page. */
export default function MaintenanceOperationsPage() {
  return (
    <MaintenanceCatalogPage
      title="Opérations de maintenance"
      subtitle="Désignations réutilisables dans les plans d’entretien"
      singular="Opération"
      singularWithArticle="l’opération"
      fields={fields}
      columns={[
        { key: 'name', label: 'Désignation' },
        {
          key: 'maintenanceType',
          label: 'Type',
          render: (value) => maintenanceTypeLabels[value] ?? value,
        },
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
      listItems={listMaintenanceOperations}
      createItem={createMaintenanceOperation}
      updateItem={updateMaintenanceOperation}
      deleteItem={deleteMaintenanceOperation}
      permissions={maintenancePermissions.operations}
    />
  );
}
