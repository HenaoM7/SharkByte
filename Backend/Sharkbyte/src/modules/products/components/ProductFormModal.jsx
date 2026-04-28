import { useState, useEffect, useRef } from 'react'
import Modal from '../../../shared/ui/Modal'
import Button from '../../../shared/ui/Button'
import { useCreateProduct, useUpdateProduct } from '../hooks'

const EMPTY = { name: '', description: '', sku: '', category: '', price: '', comparePrice: '', stock: '', available: true, tags: '' }

export default function ProductFormModal({ tenantId, product, onClose }) {
  const isEdit = !!product
  const createProduct = useCreateProduct(tenantId)
  const updateProduct = useUpdateProduct(tenantId)
  const fileRef = useRef(null)

  const [form, setForm] = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        category: product.category || '',
        price: product.price != null ? String(product.price) : '',
        comparePrice: product.comparePrice != null ? String(product.comparePrice) : '',
        stock: product.stock != null ? String(product.stock) : '',
        available: product.available ?? true,
        tags: (product.tags || []).join(', '),
      })
      if (product.imageUrl) setImagePreview(product.imageUrl)
    }
  }, [product])

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: val }))
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const buildFormData = () => {
    const fd = new FormData()
    fd.append('name', form.name)
    if (form.description) fd.append('description', form.description)
    if (form.sku) fd.append('sku', form.sku)
    if (form.category) fd.append('category', form.category)
    if (form.price !== '') fd.append('price', form.price)
    if (form.comparePrice !== '') fd.append('comparePrice', form.comparePrice)
    if (form.stock !== '') fd.append('stock', form.stock)
    fd.append('available', String(form.available))
    if (form.tags.trim()) {
      form.tags.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => fd.append('tags', t))
    }
    if (imageFile) fd.append('image', imageFile)
    return fd
  }

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setError('')

    const fd = buildFormData()
    const mutation = isEdit
      ? updateProduct.mutate({ id: product._id, formData: fd }, { onSuccess: onClose, onError: (e) => setError(e.response?.data?.message || 'Error al guardar') })
      : createProduct.mutate(fd, { onSuccess: onClose, onError: (e) => setError(e.response?.data?.message || 'Error al guardar') })

    return mutation
  }

  const saving = createProduct.isPending || updateProduct.isPending

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <div className="space-y-4">
        {/* Imagen */}
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-sb-primary transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview
              ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              : <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            }
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Imagen del producto (opcional)</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-sb-primary hover:text-sb-secondary underline"
            >
              {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
            </button>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG o WEBP · máx 5 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImage} />
        </div>

        {/* Campos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={set('name')} placeholder="Laptop IMPHERIA Pro"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
            <textarea value={form.description} onChange={set('description')} rows={2}
              placeholder="Descripción breve del producto..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary resize-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">SKU / Referencia</label>
            <input value={form.sku} onChange={set('sku')} placeholder="IMP-PRO-15"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Categoría</label>
            <input value={form.category} onChange={set('category')} placeholder="Computadores"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Precio</label>
            <input value={form.price} onChange={set('price')} type="number" min="0" placeholder="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Precio anterior (tachado)</label>
            <input value={form.comparePrice} onChange={set('comparePrice')} type="number" min="0" placeholder="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Stock (vacío = sin límite)</label>
            <input value={form.stock} onChange={set('stock')} type="number" min="0" placeholder="—"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input id="available" type="checkbox" checked={form.available} onChange={set('available')}
              className="w-4 h-4 accent-sb-primary cursor-pointer" />
            <label htmlFor="available" className="text-sm text-gray-700 cursor-pointer">Disponible para venta</label>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Etiquetas (separadas por coma)</label>
          <input value={form.tags} onChange={set('tags')} placeholder="oferta, nuevo, destacado"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSubmit}>
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
