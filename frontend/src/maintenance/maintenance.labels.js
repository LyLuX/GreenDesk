export const maintenanceTypeLabels = Object.freeze({
  preventive: 'Préventif',
  inspection: 'Inspection',
  replacement: 'Remplacement',
  lubrication: 'Lubrification',
  cleaning: 'Nettoyage',
  custom: 'Personnalisé',
});
export const maintenancePriorityLabels = Object.freeze({
  low: 'Faible',
  normal: 'Normale',
  high: 'Élevée',
  critical: 'Critique',
});
export const maintenancePriorityBadgeClasses = Object.freeze({
  low: 'priority-low',
  normal: 'priority-normal',
  high: 'priority-high',
  critical: 'priority-critical',
});
export const maintenanceStatusLabels = Object.freeze({
  upToDate: 'À jour',
  upcoming: 'Sous 30 jours',
  dueToday: 'À faire aujourd’hui',
  overdue: 'En retard',
  wearBased: 'Selon l’usure',
});
export const maintenanceStatusClasses = Object.freeze({
  upToDate: '',
  upcoming: 'maintenance-upcoming',
  dueToday: 'maintenance-due-today',
  overdue: 'maintenance-overdue',
  wearBased: 'maintenance-wear-based',
});
export const maintenanceExecutionTypeLabels = Object.freeze({
  withoutPartReplacement: 'Pièces non remplacées',
});
