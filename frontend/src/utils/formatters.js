const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/Paris',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/Paris',
});

const parseDate = (value) => {
  if (!value) return null;
  const text = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Formats a calendar date consistently as DD/MM/YYYY. */
export const formatDate = (value, emptyValue = '—') => {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : emptyValue;
};

/** Formats a timestamp consistently as DD/MM/YYYY HH:mm in the French time zone. */
export const formatDateTime = (value, emptyValue = '—') => {
  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date).replace(',', '') : emptyValue;
};

/** Combines a calendar operation date with its exact journal time. */
export const formatOperationDateTime = (performedAt, recordedAt, emptyValue = '—') => {
  const performedText = String(performedAt || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(performedText)) {
    return formatDateTime(performedAt, emptyValue);
  }
  const formattedDate = formatDate(performedAt, emptyValue);
  const recordedDate = parseDate(recordedAt);
  return recordedDate ? `${formattedDate} ${timeFormatter.format(recordedDate)}` : formattedDate;
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(number)
    : '—';
};
