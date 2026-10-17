/** Returns the shared outline color for an activation or deactivation action. */
export const getStatusActionButtonClass = (active) =>
  active ? 'btn-outline-deactivate' : 'btn-outline-brand';
