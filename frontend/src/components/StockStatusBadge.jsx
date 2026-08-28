import { stockStatusPresentation } from '../inventory/stock-status.js';

const minimumStockPresentation = {
  label: 'Stock minimum',
  badgeClass: 'stock-minimum',
};

/** Shared visual representation for inventory states. */
export default function StockStatusBadge({ status, quantityOnHand, minimumStockQuantity }) {
  const hasQuantities = quantityOnHand !== undefined && minimumStockQuantity !== undefined;
  const isAtMinimumStock = hasQuantities && Number(quantityOnHand) === Number(minimumStockQuantity);
  const presentation = isAtMinimumStock
    ? minimumStockPresentation
    : (stockStatusPresentation[status] ?? {
        label: status || 'Non renseigné',
        badgeClass: 'inactive',
      });
  return <span className={`status-badge ${presentation.badgeClass}`}>{presentation.label}</span>;
}
