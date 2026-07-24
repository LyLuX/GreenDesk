import Button from './Button.jsx';
import { ALL_ITEMS } from '../utils/pagination.js';

/** Shared pagination footer for every application data table. */
export default function PaginationControls({
  pagination,
  limit,
  onLimitChange,
  onPageChange,
  itemLabel = 'résultat(s)',
  disabled = false,
}) {
  if (!pagination) return null;

  return (
    <div className="mt-4 d-flex flex-wrap align-items-center justify-content-between gap-3 text-body-secondary small">
      <span>
        {pagination.total} {itemLabel}, page {pagination.page} sur {pagination.totalPages}
      </span>
      <label>
        Par page{' '}
        <select
          aria-label="Nombre d’éléments par page"
          className="form-select d-inline-block ms-1 w-auto"
          value={limit}
          disabled={disabled}
          onChange={(event) =>
            onLimitChange(event.target.value === ALL_ITEMS ? ALL_ITEMS : Number(event.target.value))
          }
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value={ALL_ITEMS}>Tous ({pagination.total})</option>
        </select>
      </label>
      <div className="d-flex gap-2">
        <Button
          className="btn-sm"
          type="button"
          disabled={disabled || pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Précédent
        </Button>
        <Button
          className="btn-sm"
          type="button"
          disabled={disabled || pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
