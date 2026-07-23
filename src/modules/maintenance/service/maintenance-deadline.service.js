import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';

/** Dates métier sans heure. The API treats these values as UTC calendar dates. */
export function parseDateOnly(value) {
  if (!value) return null;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new AppError('La date fournie est invalide.', HTTP_STATUS.BAD_REQUEST);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text)
    throw new AppError('La date fournie est invalide.', HTTP_STATUS.BAD_REQUEST);
  return date;
}

export const dateOnly = (date) => date.toISOString().slice(0, 10);
export const todayDateOnly = (now = new Date()) =>
  dateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
export const addDaysDateOnly = (value, days) => {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return dateOnly(date);
};
export const differenceInDays = (from, to) =>
  Math.round((parseDateOnly(to) - parseDateOnly(from)) / 86400000);

/** A task is due as soon as either date or hour deadline is reached. */
export function getDeadlineDetails({
  nextMaintenanceDate,
  nextEngineHours,
  intervalHours,
  materialEngineHours,
  today = todayDateOnly(),
}) {
  const remainingDays = nextMaintenanceDate ? differenceInDays(today, nextMaintenanceDate) : null;
  const remainingEngineHours =
    nextEngineHours !== null &&
    nextEngineHours !== undefined &&
    materialEngineHours !== null &&
    materialEngineHours !== undefined
      ? Number(nextEngineHours) - Number(materialEngineHours)
      : null;
  const dateStatus =
    remainingDays === null
      ? 'upToDate'
      : remainingDays <= 0
        ? 'overdue'
        : remainingDays <= 30
          ? 'upcoming'
          : 'upToDate';
  const hourThreshold = intervalHours ? Math.max(10, Number(intervalHours) * 0.2) : null;
  const engineHoursStatus =
    remainingEngineHours === null
      ? 'upToDate'
      : remainingEngineHours <= 0
        ? 'overdue'
        : remainingEngineHours <= hourThreshold
          ? 'upcoming'
          : 'upToDate';
  const status =
    dateStatus === 'overdue' || engineHoursStatus === 'overdue'
      ? 'overdue'
      : dateStatus === 'upcoming' || engineHoursStatus === 'upcoming'
        ? 'upcoming'
        : 'upToDate';
  return {
    status,
    dateStatus,
    engineHoursStatus,
    remainingDays,
    remainingEngineHours,
    engineHoursUpcomingThreshold: hourThreshold,
  };
}
