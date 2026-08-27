import { getStatusActionButtonClass } from '../utils/status-action.js';

export default function DataTable({
  columns = [],
  rows = [],
  onEdit,
  onStatus,
  onDelete,
  onRestore,
  onView,
  renderActions,
  emptyMessage = 'Aucun élément trouvé.',
  actionLoadingId,
  compact = false,
}) {
  const hasActions = Boolean(
    renderActions || onView || onEdit || onStatus || onDelete || onRestore,
  );
  const cellSpacing = compact ? 'px-3 py-3' : 'px-4 py-3';
  return (
    <div className="table-shell">
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={cellSpacing} scope="col" key={column.key}>
                  {column.label}
                </th>
              ))}
              {hasActions ? (
                <th className={cellSpacing} scope="col">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-5 text-center text-body-secondary"
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.uuid}>
                  {columns.map((column) => (
                    <td className={cellSpacing} key={column.key}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : (row[column.key] ?? '—')}
                    </td>
                  ))}
                  {hasActions ? (
                    <td className={cellSpacing}>
                      {renderActions?.(row)}
                      {row.deletedAt && onRestore ? (
                        <button
                          aria-label={`Restaurer ${row.name ?? 'l’élément'}`}
                          className="btn btn-sm btn-outline-activation flex-fill"
                          type="button"
                          onClick={() => onRestore(row)}
                          disabled={actionLoadingId === row.uuid}
                        >
                          {actionLoadingId === row.uuid ? 'Restauration…' : 'Restaurer'}
                        </button>
                      ) : null}
                      {!row.deletedAt && onView && (
                        <button
                          aria-label={`Voir ${row.name ?? 'l’élément'}`}
                          className="btn btn-sm btn-outline-brand flex-fill"
                          type="button"
                          onClick={() => onView(row)}
                        >
                          Voir
                        </button>
                      )}
                      {!row.deletedAt && onEdit && (
                        <button
                          aria-label={`Modifier ${row.name ?? 'l’élément'}`}
                          className="btn btn-sm btn-outline-brand flex-fill ms-1 me-1"
                          type="button"
                          onClick={() => onEdit(row)}
                          disabled={actionLoadingId === row.uuid}
                        >
                          Editer
                        </button>
                      )}
                      {!row.deletedAt && onStatus && (
                        <button
                          aria-label={`${row.active ? 'Désactiver' : 'Activer'} ${row.name ?? 'l’élément'}`}
                          className={`btn btn-sm ${getStatusActionButtonClass(row.active)} ms-1 me-1`}
                          type="button"
                          onClick={() => onStatus(row)}
                          disabled={actionLoadingId === row.uuid}
                        >
                          {actionLoadingId === row.uuid
                            ? 'Mise à jour…'
                            : row.active
                              ? 'Désactiver'
                              : 'Activer'}
                        </button>
                      )}
                      {!row.deletedAt && onDelete && (
                        <button
                          aria-label={`Supprimer ${row.name ?? 'l’élément'}`}
                          className="btn btn-sm btn-outline-danger ms-1 me-1"
                          type="button"
                          onClick={() => onDelete(row)}
                          disabled={actionLoadingId === row.uuid}
                        >
                          {actionLoadingId === row.uuid ? 'Suppression…' : 'Supprimer'}
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
