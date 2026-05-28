import { useRef, useState } from 'react'
import { useCatalogPdf, useUploadCatalogPdf, useDeleteCatalogPdf } from '../hooks'
import Spinner from '../../../shared/ui/Spinner'
import Button from '../../../shared/ui/Button'
import ConfirmModal from '../../../shared/ui/ConfirmModal'

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CatalogPdfSection({ tenantId }) {
  const fileRef = useRef(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { data: pdf, isLoading } = useCatalogPdf(tenantId)
  const upload = useUploadCatalogPdf(tenantId)
  const deletePdf = useDeleteCatalogPdf(tenantId)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('pdf', file)
    upload.mutate(fd)
    e.target.value = ''
  }

  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>

  return (
    <div>
      <p className="text-xs font-medium text-gray-700 mb-3">PDF del catálogo</p>

      {pdf?.pdfUrl ? (
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{pdf.fileName || 'catalogo.pdf'}</p>
            <p className="text-xs text-gray-400">{formatBytes(pdf.fileSize)}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <a
              href={pdf.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sb-primary hover:text-sb-secondary underline"
            >
              Ver PDF
            </a>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-sb-primary hover:text-sb-secondary underline"
            >
              Reemplazar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deletePdf.isPending}
              className="text-xs text-red-500 hover:text-red-600 underline disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-sb-primary hover:bg-sb-primary/5 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {upload.isPending ? (
            <div className="flex justify-center"><Spinner size="sm" /></div>
          ) : (
            <>
              <div className="flex justify-center mb-2">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Haz clic o arrastra tu catálogo en PDF</p>
              <p className="text-xs text-gray-400 mt-1">Máximo 20 MB · Solo archivos PDF</p>
            </>
          )}
        </div>
      )}

      {upload.isError && (
        <p className="text-xs text-red-600 mt-2">{upload.error?.response?.data?.message || 'Error al subir el PDF'}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        title="Eliminar catálogo PDF"
        message="¿Seguro que quieres eliminar el catálogo PDF? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        loading={deletePdf.isPending}
        onConfirm={() => {
          deletePdf.mutate(tenantId, { onSuccess: () => setShowDeleteConfirm(false) })
        }}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
