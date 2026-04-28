/**
 * Pagination — componente reutilizable para tablas paginadas.
 * Props: page, pages, total, limit, onPageChange
 */
export default function Pagination({ page = 1, pages = 1, total = 0, limit = 20, onPageChange }) {
  if (pages <= 1) return null

  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  // Generar array de páginas con elipsis
  const getPageNumbers = () => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const items = []
    if (page <= 4) {
      items.push(1, 2, 3, 4, 5, '...', pages)
    } else if (page >= pages - 3) {
      items.push(1, '...', pages - 4, pages - 3, pages - 2, pages - 1, pages)
    } else {
      items.push(1, '...', page - 1, page, page + 1, '...', pages)
    }
    return items
  }

  const btnCls = (active) =>
    `min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-sb-primary text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-sb-primary disabled:opacity-40 disabled:cursor-not-allowed'
    }`

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-gray-500">
        Mostrando <span className="font-medium">{start}–{end}</span> de{' '}
        <span className="font-medium">{total}</span> resultados
      </p>

      <div className="flex items-center gap-1">
        {/* Anterior */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={btnCls(false)}
          aria-label="Página anterior"
        >
          ←
        </button>

        {/* Números */}
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={btnCls(p === page)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Siguiente */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className={btnCls(false)}
          aria-label="Página siguiente"
        >
          →
        </button>
      </div>
    </div>
  )
}
