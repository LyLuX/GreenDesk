import { deleteBrandLogo, uploadBrandLogo } from '../api/brand-logo.api.js';
import BrandLogo from '../components/BrandLogo.jsx';
import ReferencePage from './ReferencePage.jsx';
export default function BrandsPage() {
  return (
    <ReferencePage
      title="Marques"
      resource="brands"
      createPermission="brands.create"
      updatePermission="brands.update"
      deletePermission="brands.delete"
      fields={[{ name: 'name', label: 'Nom', required: true }]}
      fileField={{
        name: 'logo',
        label: 'Logo',
        accept: 'image/jpeg,image/png,image/webp',
        help: 'Image JPEG, PNG ou WebP de 2 Mo maximum.',
        removeLabel: 'Retirer le logo actuel',
        hasFile: (brand) => brand.hasLogo,
        renderPreview: (brand) => <BrandLogo brand={brand} className="brand-logo-preview" />,
        upload: uploadBrandLogo,
        remove: deleteBrandLogo,
      }}
      columns={[
        {
          key: 'hasLogo',
          label: 'Logo',
          render: (_value, brand) => <BrandLogo brand={brand} />,
        },
        { key: 'name', label: 'Nom' },
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
