export const permissionActionFamilies = Object.freeze(
  [
    { key: 'read', label: 'Consultation', actions: Object.freeze(['read']) },
    {
      key: 'create',
      label: 'Création et ajout',
      actions: Object.freeze(['create', 'upload', 'resend']),
    },
    {
      key: 'update',
      label: 'Modification et paramétrage',
      actions: Object.freeze(['update', 'set_primary', 'restore']),
    },
    {
      key: 'stock',
      label: 'Gestion du stock',
      actions: Object.freeze(['adjust_on_hand', 'adjust_on_order', 'order', 'receive', 'consume']),
    },
    {
      key: 'execute',
      label: 'Exécution de maintenance',
      actions: Object.freeze(['execute', 'skip_parts']),
    },
    { key: 'delete', label: 'Suppression', actions: Object.freeze(['delete']) },
    {
      key: 'financial',
      label: 'Données financières',
      actions: Object.freeze(['financial']),
    },
  ].map(Object.freeze),
);

const permissionFamilyByAction = new Map(
  permissionActionFamilies.flatMap((family) =>
    family.actions.map((action) => [action, family.key]),
  ),
);

/** Returns the explicitly configured quick-selection family for a permission code. */
export const getPermissionFamily = (permissionName = '') => {
  const separatorIndex = permissionName.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === permissionName.length - 1) return null;
  const action = permissionName.slice(separatorIndex + 1).toLocaleLowerCase('fr');
  return permissionFamilyByAction.get(action) ?? null;
};
