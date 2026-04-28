import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLogin, useAuth } from '../hooks'

export default function Login() {
  const { login, loading, error, clearError } = useLogin()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch {
      // error is set in useLogin hook
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sb-dark flex-col items-center justify-center px-12">
        <div className="text-center w-full max-w-sm">
          {/* Logo completo con texto */}
          <div className="w-full max-w-[280px] mx-auto mb-6">
            <img src="/Logo.png" alt="SharkByte" className="w-full object-contain" />
          </div>
          <p className="text-sb-neutral text-sm max-w-xs leading-relaxed mx-auto">
            Plataforma SaaS de automatización empresarial con IA en WhatsApp
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { label: 'Ventas automatizadas', desc: 'IA que cierra ventas' },
              { label: 'WhatsApp Business', desc: 'Conexión nativa' },
              { label: 'IA integrada', desc: 'Flujos inteligentes' },
              { label: 'Sin código', desc: 'Configura en minutos' },
            ].map((f) => (
              <div key={f.label} className="bg-sb-primary/40 backdrop-blur border border-sb-primary/50 rounded-xl p-3">
                <p className="text-white text-sm font-medium">{f.label}</p>
                <p className="text-sb-neutral text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <img src="/Logo.png" alt="SharkByte" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-sb-dark font-bold text-xl">SharkByte</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">Bienvenido a SharkByte</h2>
          <p className="text-gray-500 text-sm mb-8">Ingresa a tu cuenta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4" onChange={clearError}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
              </div>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-sb-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <Link to="/forgot-password" className="text-xs text-sb-primary hover:text-sb-secondary transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
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
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            <p className="text-center text-sm text-gray-500 pt-1">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="text-sb-primary hover:text-sb-secondary font-medium transition-colors"
              >
                Regístrate gratis
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
