export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(number)
    : '—';
};
