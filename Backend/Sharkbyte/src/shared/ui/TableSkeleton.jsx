/**
 * TableSkeleton — skeleton loader para tablas mientras cargan datos.
 * Props: rows (número de filas), cols (número de columnas)
 */
export default function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-gray-50">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-6 py-4">
              <div
                className={`h-4 bg-gray-200 rounded animate-pulse ${
                  colIdx === 0 ? 'w-36' : colIdx === cols - 1 ? 'w-12' : 'w-24'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
