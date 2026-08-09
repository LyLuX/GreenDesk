import { stockStatusPresentation } from '../inventory/stock-status.js';

/** Shared visual representation for inventory states. */
export default function StockStatusBadge({ status }) {
  const presentation = stockStatusPresentation[status] ?? {
    label: status || 'Non renseigné',
    badgeClass: 'inactive',
  };
  return <span className={`status-badge ${presentation.badgeClass}`}>{presentation.label}</span>;
}
