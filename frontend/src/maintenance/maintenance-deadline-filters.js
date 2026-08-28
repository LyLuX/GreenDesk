export const maintenanceHorizonOptions = Object.freeze([
  Object.freeze({ value: 0, label: 'Aujourd’hui' }),
  Object.freeze({ value: 30, label: 'Sous 30 jours' }),
  Object.freeze({ value: 60, label: 'Sous 60 jours' }),
  Object.freeze({ value: 90, label: 'Sous 90 jours' }),
  Object.freeze({ value: 365, label: 'Sous un an' }),
]);

export const defaultMaintenanceDeadlineFilters = Object.freeze({
  horizonDays: 30,
  includeOverdue: true,
  includeWearBased: false,
});

export const defaultMaintenanceSheetFilters = Object.freeze({
  includeOverdue: false,
  includeWearBased: false,
});

/** Keeps the maintenance page's exact deadline when opening printable sheets. */
export const getMaintenanceSheetFiltersForDeadline = (deadlineStatus) => ({
  ...(deadlineStatus ? { status: deadlineStatus } : {}),
  ...defaultMaintenanceSheetFilters,
});

/** Converts the maintenance page deadline filter into an equivalent printable period. */
export const getMaintenanceDeadlineFilters = (deadlineStatus) => {
  const filtersByDeadline = {
    overdue: {
      status: 'overdue',
      horizonDays: 0,
      includeOverdue: true,
      includeWearBased: false,
    },
    dueToday: {
      status: 'dueToday',
      horizonDays: 0,
      includeOverdue: false,
      includeWearBased: false,
    },
    upcoming: {
      status: 'upcoming',
      horizonDays: 30,
      includeOverdue: false,
      includeWearBased: false,
    },
    upToDate: {
      status: 'upToDate',
      horizonDays: 365,
      includeOverdue: false,
      includeWearBased: false,
    },
    wearBased: {
      status: 'wearBased',
      horizonDays: 30,
      includeOverdue: false,
      includeWearBased: true,
    },
  };
  return filtersByDeadline[deadlineStatus] ?? { ...defaultMaintenanceDeadlineFilters };
};
