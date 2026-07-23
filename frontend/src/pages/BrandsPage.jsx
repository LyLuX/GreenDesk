import ReferencePage from './ReferencePage.jsx';
export default function BrandsPage() {
  return (
    <ReferencePage
      title="Marques"
      resource="brands"
      createPermission="brand.create"
      updatePermission="brand.update"
      disablePermission="brand.delete"
      fields={[{ name: 'name', label: 'Nom', required: true }]}
      columns={[
        { key: 'name', label: 'Nom' },
        { key: 'active', label: 'Statut', render: (value) => (value ? 'Actif' : 'Inactif') },
      ]}
    />
  );
}
