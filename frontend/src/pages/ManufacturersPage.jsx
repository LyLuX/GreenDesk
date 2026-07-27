import { deleteManufacturerLogo, uploadManufacturerLogo } from '../api/manufacturer-logo.api.js';
import ManufacturerLogo from '../components/ManufacturerLogo.jsx';
import ReferencePage from './ReferencePage.jsx';
export default function ManufacturersPage() {
  return (
    <ReferencePage
      title="Fabricants"
      resource="manufacturers"
      createPermission="manufacturers.create"
      updatePermission="manufacturers.update"
      deletePermission="manufacturers.delete"
      fields={[
        { name: 'name', label: 'Nom', required: true },
        { name: 'description', label: 'Description', multiline: true },
        { name: 'notes', label: 'Notes', multiline: true },
      ]}
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
          label: 'Logo',
          render: (_value, manufacturer) => <ManufacturerLogo manufacturer={manufacturer} />,
        },
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
    />
  );
}
