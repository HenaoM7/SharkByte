import { useState } from 'react'
import { useProducts, useDeleteProduct, useProductCategories } from '../hooks'
import ProductFormModal from './ProductFormModal'
import Button from '../../../shared/ui/Button'
import Badge from '../../../shared/ui/Badge'
import Spinner from '../../../shared/ui/Spinner'
import ConfirmModal from '../../../shared/ui/ConfirmModal'
import Pagination from '../../../shared/ui/Pagination'
import { useDebounce } from '../../../shared/hooks/useDebounce'

export default function ProductsTable({ tenantId }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [available, setAvailable] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const debouncedSearch = useDebounce(search, 350)
  const deleteProduct = useDeleteProduct(tenantId)

  const { data, isLoading } = useProducts(tenantId, {
    search: debouncedSearch || undefined,
    category: category || undefined,
    available: available || undefined,
    page,
    limit: 10,
  })

  const { data: categories = [] } = useProductCategories(tenantId)

  const handleEdit = (p) => { setEditProduct(p); setShowForm(true) }
  const handleNew = () => { setEditProduct(null); setShowForm(true) }
  const handleDelete = () => {
    deleteProduct.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar productos..."
          className="flex-1 min-w-[160px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
        />

        {categories.length > 0 && (
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sb-primary">
            <option value="">Todas las categorías</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <select value={available} onChange={(e) => { setAvailable(e.target.value); setPage(1) }}
          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sb-primary">
          <option value="">Todos</option>
          <option value="true">Disponibles</option>
          <option value="false">No disponibles</option>
        </select>

        <Button size="sm" onClick={handleNew}>+ Nuevo producto</Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          {search || category ? 'No se encontraron productos con esos filtros.' : 'No hay productos aún. ¡Crea el primero!'}
        </div>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left px-3 py-2 font-medium">Producto</th>
                <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Categoría</th>
                <th className="text-right px-3 py-2 font-medium">Precio</th>
                <th className="text-center px-3 py-2 font-medium hidden sm:table-cell">Stock</th>
                <th className="text-center px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data?.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{p.name}</p>
                        {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{p.category || '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    {p.price > 0 ? (
                      <div>
                        <span className="font-medium text-gray-800">${Number(p.price).toLocaleString()}</span>
                        {p.comparePrice > 0 && (
                          <span className="ml-1 text-xs text-gray-400 line-through">${Number(p.comparePrice).toLocaleString()}</span>
                        )}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center hidden sm:table-cell text-gray-500">
                    {p.stock != null ? p.stock : <span className="text-gray-300">∞</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={p.available ? 'active' : 'inactive'}>
                      {p.available ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-sb-primary hover:bg-sb-primary/10 rounded transition-colors"
                        title="Editar">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteTarget(p)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.pages >= 1 && data?.total > 0 && (
        <div className="mt-3">
          <Pagination page={page} pages={data.pages} total={data.total} limit={10} onPageChange={setPage} />
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ProductFormModal
          tenantId={tenantId}
          product={editProduct}
          onClose={() => { setShowForm(false); setEditProduct(null) }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          open
          title="Eliminar producto"
          message={`¿Seguro que quieres eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleteProduct.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
