function fmt(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function renderMedia(msg) {
  const { type, content, mediaUrl } = msg

  if (type === 'image') {
    if (mediaUrl) {
      return (
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
          <img
            src={mediaUrl}
            alt="imagen"
            className="rounded-lg max-w-full max-h-52 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      )
    }
    return (
      <div className="flex items-center gap-2 py-1 opacity-80">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm">Imagen</span>
      </div>
    )
  }

  if (type === 'audio') {
    if (mediaUrl) {
      return (
        <audio controls src={mediaUrl} className="max-w-full mb-1" style={{ height: 36, minWidth: 200 }} />
      )
    }
    return (
      <div className="flex items-center gap-2 py-1 opacity-80">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15.536 8.464a5 5 0 010 7.072M12 18.364A9 9 0 003.636 12m0 0A9 9 0 0112 5.636M12 18.364A9 9 0 0020.364 12M12 18.364v-12"
          />
        </svg>
        <span className="text-sm">Audio</span>
      </div>
    )
  }

  if (type === 'document') {
    const label = content || 'Documento'
    if (mediaUrl) {
      return (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 py-1 underline opacity-90 mb-1"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-sm truncate max-w-[180px]">{label}</span>
        </a>
      )
    }
    return (
      <div className="flex items-center gap-2 py-1 opacity-80">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="text-sm">{label || 'Documento'}</span>
      </div>
    )
  }

  // Text
  if (content) {
    return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</p>
  }

  return <p className="text-sm opacity-50 italic">Mensaje vacío</p>
}

export default function MessageBubble({ msg }) {
  const isClient = msg.sender === 'client'

  return (
    <div className={`flex ${isClient ? 'justify-start' : 'justify-end'} mb-2.5`}>
      <div
        className={`max-w-[75%] px-3 py-2 rounded-2xl ${
          isClient
            ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
            : 'bg-sb-primary text-white rounded-tr-sm'
        }`}
      >
        {renderMedia(msg)}
        <p className={`text-[10px] mt-1 text-right ${isClient ? 'text-gray-400' : 'text-white/70'}`}>
          {fmt(msg.createdAt)}
          {!isClient && (
            <span className="ml-1">
              {msg.sender === 'agent' ? '· Agente' : '· Bot'}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
