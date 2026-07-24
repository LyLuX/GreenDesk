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
      columns={[
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
