import { useState } from 'react'
import Modal from '../../../shared/ui/Modal'
import Button from '../../../shared/ui/Button'
import { useChangePassword } from '../hooks'

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { changePassword, loading, error, clearError } = useChangePassword()
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    const current = e.target.currentPassword.value
    const next = e.target.newPassword.value
    const confirm = e.target.confirmPassword.value
    if (next !== confirm) {
      setFormError('Las contraseñas no coinciden')
      return
    }
    if (next.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    try {
      await changePassword(current, next)
      setSuccess(true)
    } catch {
      // error from hook
    }
  }

  const handleClose = () => {
    setSuccess(false)
    setFormError(null)
    clearError()
    onClose()
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="Cambiar contraseña">
      {success ? (
        <div className="text-center space-y-4 py-2">
          <div className="w-12 h-12 bg-sb-primary/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Tu contraseña se actualizó correctamente.</p>
          <Button onClick={handleClose} className="w-full justify-center">Cerrar</Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          onChange={() => { setFormError(null); clearError() }}
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contraseña actual</label>
            <input
              name="currentPassword"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
            <input
              name="newPassword"
              type="password"
              required
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirmar nueva contraseña</label>
            <input
              name="confirmPassword"
              type="password"
              required
              placeholder="Repite la contraseña"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
            />
          </div>

          {(formError || error) && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
              {formError || error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} className="flex-1 justify-center">
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1 justify-center">
              Cambiar contraseña
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
