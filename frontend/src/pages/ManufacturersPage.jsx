import { deleteManufacturerLogo, uploadManufacturerLogo } from '../api/manufacturer-logo.api.js';
import ManufacturerLogo from '../components/ManufacturerLogo.jsx';
import { activityStatusFilter } from '../filters/filter-options.js';
import ReferencePage from './ReferencePage.jsx';
export default function ManufacturersPage() {
  return (
    <ReferencePage
      title="Fabricants"
      resource="manufacturers"
      createPermission="manufacturers.create"
      updatePermission="manufacturers.update"
      deletePermission="manufacturers.delete"
      statusAction
      fields={[{ name: 'name', label: 'Nom', required: true }]}
      fileField={{
        name: 'logo',
        label: 'Logo',
        accept: 'image/jpeg,image/png,image/webp',
        help: 'Image JPEG, PNG ou WebP de 2 Mo maximum.',
        removeLabel: 'Retirer le logo actuel',
        hasFile: (manufacturer) => manufacturer.hasLogo,
        renderPreview: (manufacturer) => (
          <ManufacturerLogo manufacturer={manufacturer} className="brand-logo-preview" />
        ),
        upload: uploadManufacturerLogo,
        remove: deleteManufacturerLogo,
      }}
      columns={[
        {
          key: 'hasLogo',
          label: 'Fabricant',
          render: (_value, manufacturer) => <ManufacturerLogo manufacturer={manufacturer} />,
        },
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
