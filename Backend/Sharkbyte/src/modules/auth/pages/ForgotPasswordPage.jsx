import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useForgotPassword } from '../hooks'

export default function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { forgotPassword, loading, error, success, clearError } = useForgotPassword()

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const email = e.target.email.value.trim()
    try {
      await forgotPassword(email)
    } catch {
      // error set in hook
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sb-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <img src="/Logo.png" alt="SharkByte" className="w-10 h-10 object-contain" />
          </div>
          <span className="font-bold text-sb-dark text-xl">SharkByte</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-sb-primary/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Revisa tu email</h2>
              <p className="text-sm text-gray-500">
                Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <Link
                to="/login"
                className="block w-full text-center bg-sb-primary hover:bg-sb-secondary text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors mt-4"
              >
                Volver al login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Recuperar contraseña</h2>
              <p className="text-gray-500 text-sm mb-6">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" onChange={clearError}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="tu@email.com"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-sb-primary"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sb-primary hover:bg-sb-secondary disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>

                <p className="text-center text-sm text-gray-500 pt-1">
                  <Link to="/login" className="text-sb-primary hover:text-sb-secondary font-medium transition-colors">
                    ← Volver al login
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
