export default function DataTable({ columns, rows, onEdit, onStatus }) {
  return (
    <div className="overflow-x-auto border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3" key={column.key}>
                {column.label}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t" key={row.uuid}>
              {columns.map((column) => (
                <td className="px-4 py-3" key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
              <td className="space-x-2 px-4 py-3">
                <button onClick={() => onEdit(row)}>Editer</button>
                <button onClick={() => onStatus(row)}>
                  {row.active ? 'Désactiver' : 'Activer'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
