export default function DataTable({
  columns = [],
  rows = [],
  onEdit,
  onStatus,
  onView,
  emptyMessage = 'Aucun élément trouvé.',
  actionLoadingId,
}) {
  return (
    <div className="table-shell table-responsive">
      <table className="table table-hover align-middle">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3" scope="col" key={column.key}>
                {column.label}
              </th>
            ))}
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-4 py-5 text-center text-body-secondary"
                colSpan={columns.length + 1}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.uuid}>
                {columns.map((column) => (
                  <td className="px-4 py-3" key={column.key}>
                    {column.render ? column.render(row[column.key], row) : (row[column.key] ?? '—')}
                  </td>
                ))}
                <td className="px-4 py-3 text-nowrap">
                  {onView && (
                    <button
                      aria-label={`Voir ${row.name ?? 'l’élément'}`}
                      className="btn btn-sm btn-outline-brand me-2"
                      type="button"
                      onClick={() => onView(row)}
                    >
                      Voir
                    </button>
                  )}
                  {onEdit && (
                    <button
                      aria-label={`Modifier ${row.name ?? 'l’élément'}`}
                      className="btn btn-sm btn-outline-brand me-2"
                      type="button"
                      onClick={() => onEdit(row)}
                      disabled={actionLoadingId === row.uuid}
                    >
                      Editer
                    </button>
                  )}
                  {onStatus && (
                    <button
                      aria-label={`${row.active ? 'Désactiver' : 'Activer'} ${row.name ?? 'l’élément'}`}
                      className="btn btn-sm btn-outline-secondary"
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
