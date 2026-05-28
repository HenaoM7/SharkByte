const variants = {
  primary:   'bg-sb-primary hover:bg-sb-secondary disabled:opacity-50 text-white transition-colors duration-200',
  secondary: 'bg-white hover:bg-sb-bg border border-gray-200 text-gray-700 transition-colors duration-200',
  danger:    'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white',
  ghost:     'hover:bg-sb-bg text-sb-neutral hover:text-sb-primary disabled:opacity-50 transition-colors duration-200',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors cursor-pointer
        ${variants[variant] ?? variants.primary}
        ${sizes[size] ?? sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
}
