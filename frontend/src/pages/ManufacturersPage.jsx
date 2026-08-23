import { deleteManufacturerLogo, uploadManufacturerLogo } from '../api/manufacturer-logo.api.js';
import ManufacturerLogo from '../components/ManufacturerLogo.jsx';
import { activityStatusFilter } from '../filters/filter-options.js';
import ReferencePage from './ReferencePage.jsx';
import fleetPermissions from '../permissions/fleet.permissions.js';
export default function ManufacturersPage() {
  return (
    <ReferencePage
      title="Fabricants"
      resource="manufacturers"
      createPermission={fleetPermissions.manufacturers.create}
      updatePermission={fleetPermissions.manufacturers.update}
      deletePermission={fleetPermissions.manufacturers.delete}
      statusPermission={fleetPermissions.manufacturers.status.update}
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
        uploadPermission: fleetPermissions.manufacturers.logo.upload,
        deletePermission: fleetPermissions.manufacturers.logo.delete,
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
