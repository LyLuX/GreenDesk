export const HISTORY_SECTIONS = Object.freeze({
  FLEET: 'fleet',
  MAINTENANCE: 'maintenance',
  ADMINISTRATION: 'administration',
});

export const HISTORY_TYPES = Object.freeze({
  [HISTORY_SECTIONS.FLEET]: Object.freeze(['material', 'category', 'manufacturer', 'supplier']),
  [HISTORY_SECTIONS.MAINTENANCE]: Object.freeze([
    'maintenance_plan',
    'maintenance_sheet_print',
    'planned_execution',
    'unplanned_intervention',
    'maintenance_operation',
    'maintenance_part',
    'stock_movement',
    'price_change',
  ]),
  [HISTORY_SECTIONS.ADMINISTRATION]: Object.freeze(['user', 'role', 'permission']),
});

export const HISTORY_SECTION_VALUES = Object.freeze(Object.values(HISTORY_SECTIONS));
export const HISTORY_TYPE_VALUES = Object.freeze(Object.values(HISTORY_TYPES).flat());
