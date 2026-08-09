import MaterialManufacturerCell from '../components/MaterialManufacturerCell.jsx';
import { activityStatusFilter } from '../filters/filter-options.js';
import { formatCurrency } from '../utils/formatters.js';
import ReferencePage from './ReferencePage.jsx';

const columns = [
  { key: 'name', label: 'Nom' },
  {
    key: 'manufacturer',
    label: 'Fabricant',
    render: (value) => <MaterialManufacturerCell manufacturer={value} />,
  },
  { key: 'unit', label: 'Unité' },
  { key: 'purchasePrice', label: 'Achat', render: formatCurrency },
  {
    key: 'active',
    label: 'Statut',
    render: (value) => (
      <span className={`status-badge ${value ? '' : 'inactive'}`}>
        {value ? 'Actif' : 'Inactif'}
      </span>
    ),
  },
];

const fields = [
  { name: 'name', label: 'Nom', required: true },
  {
    name: 'manufacturerUuid',
    label: 'Fabricant',
    relation: 'manufacturer',
    optionsResource: 'manufacturers',
  },
  {
    name: 'categoryUuid',
    label: 'Catégorie',
    relation: 'category',
    optionsResource: 'categories',
  },
  { name: 'model', label: 'Modèle' },
  { name: 'serialNumber', label: 'Numéro de série' },
  { name: 'purchaseDate', label: 'Date d’achat', type: 'date' },
  { name: 'commissionedAt', label: 'Mise en service', type: 'date' },
  { name: 'retiredAt', label: 'Sortie de service', type: 'date' },
  { name: 'notes', label: 'Notes', multiline: true },
  { name: 'unit', label: 'Unité', required: true },
  {
    name: 'purchasePrice',
    label: 'Prix achat',
    type: 'number',
    valueType: 'number',
    step: '0.01',
    min: '0',
    required: true,
  },
];

const filters = [
  { name: 'active', ...activityStatusFilter },
  {
    name: 'manufacturerUuid',
    label: 'Fabricant',
    emptyLabel: 'Tous les fabricants',
    optionsResource: 'manufacturers',
  },
  {
    name: 'categoryUuid',
    label: 'Catégorie',
    emptyLabel: 'Toutes les catégories',
    optionsResource: 'categories',
  },
];

/** Material catalogue route configuration kept outside the application router. */
export default function MaterialsPage() {
  return (
    <ReferencePage
      title="Matériels"
      resource="materials"
      createPermission="materials.create"
      updatePermission="materials.update"
      deletePermission="materials.delete"
      statusAction
      fields={fields}
      columns={columns}
      filters={filters}
      pagination
      detailPath={(row) => `/materials/${row.uuid}`}
    />
  );
}
