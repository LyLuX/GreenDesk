import ResponsiveTable from './ResponsiveTable.jsx';
import TableActions from './TableActions.jsx';
import Icon from './Icon.jsx';
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
  const hasMobileColumns = columns.some((column) => column.hideOnMobile);
  const cellSpacing = hasMobileColumns
    ? `px-2 ${compact ? 'px-sm-3' : 'px-sm-4'} py-3`
    : compact
      ? 'px-3 py-3'
      : 'px-4 py-3';
  const columnClassName = (column) =>
    `${cellSpacing}${column.hideOnMobile ? ' d-none d-sm-table-cell' : ''}`;
  return (
    <div className="table-shell">
      <div className="table-responsive">
        <ResponsiveTable className="table table-hover align-middle">
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={columnClassName(column)} scope="col" key={column.key}>
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
                  <div className="empty-state">
                    <Icon name="empty" />
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.uuid}>
                  {columns.map((column) => (
                    <td className={columnClassName(column)} key={column.key}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : (row[column.key] ?? '—')}
                    </td>
                  ))}
                  {hasActions ? (
                    <td className={cellSpacing}>
                      <TableActions
                        secondary={
                          <>
                            {!row.deletedAt && onStatus && (
                              <button
                                aria-label={`${row.active ? 'Désactiver' : 'Activer'} ${row.name ?? 'l’élément'}`}
                                className={`btn btn-sm ${getStatusActionButtonClass(row.active)}`}
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
                                className="btn btn-sm btn-outline-danger"
                                type="button"
                                onClick={() => onDelete(row)}
                                disabled={actionLoadingId === row.uuid}
                              >
                                {actionLoadingId === row.uuid ? 'Suppression…' : 'Supprimer'}
                              </button>
                            )}
                          </>
                        }
                      >
                        {renderActions?.(row)}
                        {row.deletedAt && onRestore ? (
                          <button
                            aria-label={`Restaurer ${row.name ?? 'l’élément'}`}
                            className="btn btn-sm btn-outline-brand"
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
                            className="btn btn-sm btn-outline-brand-blue"
                            type="button"
                            onClick={() => onView(row)}
                          >
                            Voir
                          </button>
                        )}
                        {!row.deletedAt && onEdit && (
                          <button
                            aria-label={`Modifier ${row.name ?? 'l’élément'}`}
                            className="btn btn-sm btn-outline-edit"
                            type="button"
                            onClick={() => onEdit(row)}
                            disabled={actionLoadingId === row.uuid}
                          >
                            Modifier
                          </button>
                        )}
                      </TableActions>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </ResponsiveTable>
      </div>
    </div>
  );
}
