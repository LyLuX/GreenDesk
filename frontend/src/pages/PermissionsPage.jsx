import ReferencePage from './ReferencePage.jsx';

/** Administrator catalogue for the permission codes assigned to roles. */
export default function PermissionsPage() {
  return (
    <ReferencePage
      title="Permissions"
      resource="permissions"
      createPermission="ADMIN"
      updatePermission="ADMIN"
      deletePermission="ADMIN"
      fields={[
        { name: 'name', label: 'Code', required: true },
        { name: 'description', label: 'Description' },
      ]}
      columns={[
        { key: 'name', label: 'Code' },
        { key: 'description', label: 'Description' },
      ]}
    />
  );
}
