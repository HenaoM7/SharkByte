import Modal from './Modal'
import Button from './Button'

/**
 * ConfirmModal — diálogo de confirmación antes de acciones destructivas.
 * Props: open, onClose, onConfirm, title, message, confirmLabel, variant ('danger' | 'primary')
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="flex-1 justify-center"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={onConfirm}
            loading={loading}
            className="flex-1 justify-center"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
