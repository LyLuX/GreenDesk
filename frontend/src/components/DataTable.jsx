export default function DataTable({
  columns = [],
  rows = [],
  onEdit,
  onStatus,
  emptyMessage = 'Aucun élément trouvé.',
  actionLoadingId,
}) {
  return (
    <div className="overflow-x-auto border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50">
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
              <td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length + 1}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr className="border-t" key={row.uuid}>
                {columns.map((column) => (
                  <td className="px-4 py-3" key={column.key}>
                    {column.render ? column.render(row[column.key], row) : (row[column.key] ?? '—')}
                  </td>
                ))}
                <td className="space-x-2 px-4 py-3">
                  {onEdit && (
                    <button
                      aria-label={`Modifier ${row.name ?? 'l’élément'}`}
                      onClick={() => onEdit(row)}
                      disabled={actionLoadingId === row.uuid}
                    >
                      Editer
                    </button>
                  )}
                  {onStatus && (
                    <button
                      aria-label={`${row.active ? 'Désactiver' : 'Activer'} ${row.name ?? 'l’élément'}`}
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
