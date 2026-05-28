import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Chunk mismatch tras deploy — recargar automáticamente una vez
    const isChunkError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module')
    if (isChunkError) {
      const reloaded = sessionStorage.getItem('chunk_reload')
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload', '1')
        window.location.reload()
        return { hasError: false, error: null }
      }
    }
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Error capturado:', error.message, '\nComponente:', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Algo salió mal</h1>
            <p className="text-sm text-gray-500">
              {this.state.error?.message ?? 'Error inesperado en la aplicación.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-5 py-2 bg-sb-primary text-white text-sm font-medium rounded-lg hover:bg-sb-secondary transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
