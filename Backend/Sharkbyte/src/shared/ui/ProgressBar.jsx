export default function ProgressBar({ used = 0, max = 0, label }) {
  if (max === -1) {
    return (
      <div>
        {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
        <div className="h-2 bg-gray-100 rounded-full">
          <div className="h-2 bg-sb-primary rounded-full w-full opacity-30" />
        </div>
        <p className="text-xs text-gray-400 mt-1">Ilimitado</p>
      </div>
    )
  }

  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-sb-primary'

  return (
    <div>
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {used.toLocaleString()} / {max.toLocaleString()} ({pct}%)
      </p>
    </div>
  )
}
