// Date formatters
export const formatDate = (dateStr, options = {}) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Next month reset date
export const nextMonthReset = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Number formatters
export const formatNumber = (n) =>
  (n ?? 0).toLocaleString('es-CO')

export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(amount ?? 0)
