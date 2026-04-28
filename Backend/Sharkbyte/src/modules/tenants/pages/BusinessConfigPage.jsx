import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBusinessConfig, useUpsertBusinessConfig, useTenant, useReferences, useCreateReference, useUpdateReference, useDeleteReference, useChannels, useUpsertChannel, useDeleteChannel } from '../hooks'
import Badge from '../../../shared/ui/Badge'
import Button from '../../../shared/ui/Button'
import Spinner from '../../../shared/ui/Spinner'
import ProductsTable from '../../products/components/ProductsTable'
import CatalogPdfSection from '../../products/components/CatalogPdfSection'

// ─── helpers ────────────────────────────────────────────────────────────────

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DEFAULT_SCHEDULE = DAYS.map((day) => ({
  day,
  open: '09:00',
  close: '18:00',
  isOpen: day !== 'Sábado' && day !== 'Domingo',
}))

function InlineMsg({ msg }) {
  if (!msg) return null
  return (
    <p className={`text-xs mt-1 ${msg.type === 'error' ? 'text-red-600' : 'text-sb-primary'}`}>
      {msg.text}
    </p>
  )
}

// ─── Tag Input ───────────────────────────────────────────────────────────────

function TagInput({ tags = [], onChange, placeholder }) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag))

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
        />
        <button type="button" onClick={addTag} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors">
          Agregar
        </button>
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, onSave, saving, msg, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-3 sm:shrink-0">
          <InlineMsg msg={msg} />
          <Button size="sm" loading={saving} onClick={onSave}>Guardar</Button>
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Tab: Identidad ──────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: '', label: 'Selecciona un tipo...' },
  { value: 'restaurante', label: 'Restaurante / Food' },
  { value: 'tienda', label: 'Tienda / Retail' },
  { value: 'servicios', label: 'Servicios profesionales' },
  { value: 'inmobiliaria', label: 'Inmobiliaria' },
  { value: 'salud', label: 'Salud y bienestar' },
  { value: 'educacion', label: 'Educación' },
  { value: 'logistica', label: 'Logística / Transporte' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'otro', label: 'Otro' },
]

const CURRENCIES = [
  { value: 'COP', label: 'COP — Peso colombiano' },
  { value: 'MXN', label: 'MXN — Peso mexicano' },
  { value: 'PEN', label: 'PEN — Sol peruano' },
  { value: 'CLP', label: 'CLP — Peso chileno' },
  { value: 'ARS', label: 'ARS — Peso argentino' },
  { value: 'USD', label: 'USD — Dólar americano' },
  { value: 'EUR', label: 'EUR — Euro' },
]

const TEAM_SIZES = [
  { value: '', label: 'Selecciona...' },
  { value: '1', label: 'Solo yo' },
  { value: '2-5', label: '2 – 5 personas' },
  { value: '6-20', label: '6 – 20 personas' },
  { value: '21-100', label: '21 – 100 personas' },
  { value: '100+', label: 'Más de 100' },
]

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary'
const selectCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sb-primary'

function IdentidadTab({ config, onSave, saving }) {
  const [form, setForm] = useState({
    businessName:      config?.businessName      ?? '',
    businessType:      config?.businessType      ?? '',
    businessTypeCustom: config?.businessTypeCustom ?? '',
    country:           config?.country           ?? 'Colombia',
    targetAudience:    config?.targetAudience    ?? '',
    agentName:         config?.agentName         ?? '',
    currency:          config?.currency          ?? 'COP',
    teamSize:          config?.teamSize          ?? '',
  })
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (config) setForm({
      businessName:      config.businessName      ?? '',
      businessType:      config.businessType      ?? '',
      businessTypeCustom: config.businessTypeCustom ?? '',
      country:           config.country           ?? 'Colombia',
      targetAudience:    config.targetAudience    ?? '',
      agentName:         config.agentName         ?? '',
      currency:          config.currency          ?? 'COP',
      teamSize:          config.teamSize          ?? '',
    })
  }, [config])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = () => {
    setMsg(null)
    onSave(form, setMsg)
  }

  return (
    <div className="space-y-4">
      <Section title="Identidad del Negocio" description="Información básica para contextualizar a la IA" onSave={handleSave} saving={saving} msg={msg}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre del negocio */}
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Nombre del negocio</label>
            <input value={form.businessName} onChange={set('businessName')} placeholder="Mi Empresa S.A.S."
              className={inputCls} />
          </div>

          {/* Tipo de negocio */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de negocio</label>
            <select value={form.businessType} onChange={set('businessType')} className={selectCls}>
              {BUSINESS_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Tipo personalizado (visible solo cuando es "otro") */}
          {form.businessType === 'otro' ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Especifica el tipo de negocio</label>
              <input value={form.businessTypeCustom} onChange={set('businessTypeCustom')} placeholder="Describe brevemente tu negocio..."
                className={inputCls} />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-500 mb-1">País</label>
              <input value={form.country} onChange={set('country')} placeholder="Colombia"
                className={inputCls} />
            </div>
          )}

          {/* País (aparece en segunda fila si businessType === 'otro') */}
          {form.businessType === 'otro' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">País</label>
              <input value={form.country} onChange={set('country')} placeholder="Colombia"
                className={inputCls} />
            </div>
          )}

          {/* Público objetivo */}
          <div className={form.businessType === 'otro' ? '' : ''}>
            <label className="block text-xs text-gray-500 mb-1">Público objetivo</label>
            <input value={form.targetAudience} onChange={set('targetAudience')} placeholder="adultos 25-45 años, empresas PYME..."
              className={inputCls} />
          </div>

          {/* Nombre del agente IA */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre del agente IA</label>
            <input value={form.agentName} onChange={set('agentName')} placeholder="Sofía, Asistente, Bot..."
              className={inputCls} />
            <p className="text-xs text-gray-400 mt-0.5">Nombre con el que la IA se presentará a tus clientes</p>
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Moneda principal</label>
            <select value={form.currency} onChange={set('currency')} className={selectCls}>
              {CURRENCIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Tamaño del equipo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tamaño del equipo</label>
            <select value={form.teamSize} onChange={set('teamSize')} className={selectCls}>
              {TEAM_SIZES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* Manual de Configuración Profesional */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-sb-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Manual de Configuración Profesional</h3>
            <p className="text-xs text-gray-500 mb-3">
              Guía paso a paso para configurar correctamente tu negocio y obtener el máximo rendimiento de la automatización con IA. Incluye ejemplos de prompts, flujos recomendados y buenas prácticas.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/Guía Profesional de Configuración de Prompts para Negocios.pdf"
                download="Manual-SharkByte-Configuracion-Profesional.pdf"
                className="inline-flex items-center gap-2 px-4 py-2 bg-sb-primary hover:bg-sb-secondary text-white text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Manual PDF
              </a>
              <a
                href="/Guía Profesional de Configuración de Prompts para Negocios.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800 text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver en línea
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Comunicación ───────────────────────────────────────────────────────

function ComunicacionTab({ config, onSave, saving }) {
  const [form, setForm] = useState({
    welcomeMessage: config?.welcomeMessage ?? '',
    tone: config?.tone ?? 'amigable',
    language: config?.language ?? 'es',
    outOfHoursMessage: config?.outOfHoursMessage ?? '',
    prohibitedWords: config?.prohibitedWords ?? [],
  })
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (config) setForm({
      welcomeMessage: config.welcomeMessage ?? '',
      tone: config.tone ?? 'amigable',
      language: config.language ?? 'es',
      outOfHoursMessage: config.outOfHoursMessage ?? '',
      prohibitedWords: config.prohibitedWords ?? [],
    })
  }, [config])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Section title="Comunicación" description="Tono, idioma y mensajes automáticos" onSave={() => { setMsg(null); onSave(form, setMsg) }} saving={saving} msg={msg}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mensaje de bienvenida</label>
          <textarea value={form.welcomeMessage} onChange={set('welcomeMessage')} rows={3}
            placeholder="¡Hola! Soy el asistente de [Negocio]. ¿En qué puedo ayudarte hoy?"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tono de comunicación</label>
            <select value={form.tone} onChange={set('tone')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sb-primary">
              <option value="amigable">Amigable</option>
              <option value="formal">Formal</option>
              <option value="informal">Informal</option>
              <option value="profesional">Profesional</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Idioma</label>
            <select value={form.language} onChange={set('language')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sb-primary">
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mensaje fuera de horario</label>
          <textarea value={form.outOfHoursMessage} onChange={set('outOfHoursMessage')} rows={2}
            placeholder="Estamos fuera de horario. Atendemos de lunes a viernes de 9am a 6pm."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary resize-none" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2">Palabras prohibidas</label>
          <TagInput
            tags={form.prohibitedWords}
            onChange={(tags) => setForm((f) => ({ ...f, prohibitedWords: tags }))}
            placeholder="Agregar palabra prohibida..."
          />
        </div>
      </div>
    </Section>
  )
}

// ─── Tab: Operaciones ────────────────────────────────────────────────────────

function OperacionesTab({ tenantId, config, onSave, saving }) {
  const [timezone, setTimezone] = useState(config?.businessHours?.timezone ?? 'America/Bogota')
  const [schedule, setSchedule] = useState(config?.businessHours?.schedule?.length ? config.businessHours.schedule : DEFAULT_SCHEDULE)
  const [faq, setFaq] = useState(config?.faq ?? [])
  const [catalogDriveUrl, setCatalogDriveUrl] = useState(config?.catalogDriveUrl ?? '')
  const [msg, setMsg] = useState(null)

  // New FAQ item
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' })

  useEffect(() => {
    if (config) {
      setTimezone(config.businessHours?.timezone ?? 'America/Bogota')
      setSchedule(config.businessHours?.schedule?.length ? config.businessHours.schedule : DEFAULT_SCHEDULE)
      setFaq(config.faq ?? [])
      setCatalogDriveUrl(config.catalogDriveUrl ?? '')
    }
  }, [config])

  const updateDay = (idx, key, value) => {
    setSchedule((s) => s.map((d, i) => i === idx ? { ...d, [key]: value } : d))
  }

  const addFaqItem = () => {
    if (!newFaq.question || !newFaq.answer) return
    setFaq((f) => [...f, newFaq])
    setNewFaq({ question: '', answer: '' })
  }

  const removeFaqItem = (idx) => setFaq((f) => f.filter((_, i) => i !== idx))

  const handleSave = () => {
    setMsg(null)
    onSave({ businessHours: { timezone, schedule }, faq, catalogDriveUrl: catalogDriveUrl.trim() }, setMsg)
  }

  return (
    <>
    <Section title="Operaciones" description="Horario de atención, link de catálogo externo y preguntas frecuentes" onSave={handleSave} saving={saving} msg={msg}>
      <div className="space-y-6">
        {/* Business Hours */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-700">Horario de atención</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Zona horaria:</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sb-primary">
                <option value="America/Bogota">América/Bogotá</option>
                <option value="America/Mexico_City">América/Ciudad de México</option>
                <option value="America/Lima">América/Lima</option>
                <option value="America/Santiago">América/Santiago</option>
                <option value="America/Buenos_Aires">América/Buenos Aires</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-100">
          <div className="min-w-[400px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Día</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-500">Abierto</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Apertura</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Cierre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schedule.map((day, idx) => (
                  <tr key={day.day} className={day.isOpen ? '' : 'opacity-50'}>
                    <td className="px-3 py-2 font-medium text-gray-700">{day.day}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={day.isOpen}
                        onChange={(e) => updateDay(idx, 'isOpen', e.target.checked)}
                        className="w-4 h-4 accent-[#153959] cursor-pointer" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="time" value={day.open} disabled={!day.isOpen}
                        onChange={(e) => updateDay(idx, 'open', e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-sb-primary disabled:bg-gray-50" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="time" value={day.close} disabled={!day.isOpen}
                        onChange={(e) => updateDay(idx, 'close', e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-sb-primary disabled:bg-gray-50" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>

        {/* Link de catálogo en Google Drive — parte del contexto de horarios/operación */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">Link de catálogo externo</p>
          <p className="text-xs text-gray-400 mb-2">
            Cuando el cliente pida ver el catálogo completo, la IA compartirá este enlace. Ideal para catálogos en Google Drive, Dropbox o similares.
          </p>
          <div className="flex gap-2 items-center">
            <input
              value={catalogDriveUrl}
              onChange={e => setCatalogDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
            />
            {catalogDriveUrl && (
              <a
                href={catalogDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-xs text-sb-primary hover:underline"
              >
                Ver
              </a>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-3">Preguntas frecuentes</p>
          {faq.length > 0 && (
            <div className="space-y-2 mb-3">
              {faq.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{item.question}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.answer}</p>
                  </div>
                  <button onClick={() => removeFaqItem(idx)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="border border-dashed border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-400">Agregar pregunta frecuente</p>
            <input value={newFaq.question} onChange={(e) => setNewFaq((n) => ({ ...n, question: e.target.value }))}
              placeholder="¿Cuál es la pregunta?" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sb-primary" />
            <input value={newFaq.answer} onChange={(e) => setNewFaq((n) => ({ ...n, answer: e.target.value }))}
              placeholder="Respuesta..." className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sb-primary" />
            <button onClick={addFaqItem}
              className="px-3 py-1.5 bg-sb-primary hover:bg-sb-secondary text-white text-sm rounded transition-colors cursor-pointer">
              Agregar
            </button>
          </div>
        </div>
      </div>
    </Section>

    {/* Catálogo de productos — sección independiente con su propio CRUD */}
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Catálogo de productos y servicios</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Gestiona los productos y servicios que la IA utilizará para responder consultas y procesar ventas.
        </p>
      </div>
      <ProductsTable tenantId={tenantId} />
    </div>

    {/* PDF del catálogo — sección independiente con su propio upload */}
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-800">PDF del catálogo</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Sube un PDF con tu catálogo completo. La IA lo compartirá cuando un cliente lo solicite.
        </p>
      </div>
      <CatalogPdfSection tenantId={tenantId} />
    </div>

    <AgendamientoSection config={config} onSave={onSave} saving={saving} />
    </>
  )
}

// ─── Tab: Automatizaciones ───────────────────────────────────────────────────

function AutomatizacionesTab({ config, onSave, saving }) {
  const [automations, setAutomations] = useState({
    sales: false, support: false, reservations: false, payments: false, alerts: false,
    ...(config?.automations ?? {}),
  })
  const [autoResponses, setAutoResponses] = useState(config?.autoResponses ?? {})
  const [trigger, setTrigger] = useState('')
  const [response, setResponse] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (config) {
      setAutomations({ sales: false, support: false, reservations: false, payments: false, alerts: false, ...(config.automations ?? {}) })
      setAutoResponses(config.autoResponses ?? {})
    }
  }, [config])

  const toggleAutomation = (key) => setAutomations((a) => ({ ...a, [key]: !a[key] }))

  const addResponse = () => {
    if (!trigger || !response) return
    setAutoResponses((r) => ({ ...r, [trigger]: response }))
    setTrigger('')
    setResponse('')
  }

  const removeResponse = (key) => setAutoResponses((r) => { const c = { ...r }; delete c[key]; return c })

  const AUTOMATION_LABELS = {
    sales: 'Ventas', support: 'Soporte', reservations: 'Reservaciones', payments: 'Pagos', alerts: 'Alertas',
  }

  return (
    <Section title="Automatizaciones" description="Funcionalidades habilitadas y respuestas automáticas por trigger" onSave={() => { setMsg(null); onSave({ automations, autoResponses }, setMsg) }} saving={saving} msg={msg}>
      <div className="space-y-6">
        {/* Toggles */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-3">Módulos habilitados</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(AUTOMATION_LABELS).map(([key, label]) => (
              <button key={key} type="button" onClick={() => toggleAutomation(key)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${automations[key] ? 'border-sb-primary bg-sb-primary/10 text-sb-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                <div className={`w-3 h-3 rounded-full ${automations[key] ? 'bg-sb-primary' : 'bg-gray-300'}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto Responses */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-3">Respuestas automáticas</p>
          {Object.keys(autoResponses).length > 0 && (
            <div className="space-y-2 mb-3">
              {Object.entries(autoResponses).map(([t, r]) => (
                <div key={t} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-sb-primary bg-sb-primary/10 px-2 py-0.5 rounded inline-block mb-1">{t}</p>
                    <p className="text-sm text-gray-700">{r}</p>
                  </div>
                  <button onClick={() => removeResponse(t)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="border border-dashed border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-400">Agregar respuesta (trigger → respuesta)</p>
            <input value={trigger} onChange={(e) => setTrigger(e.target.value)}
              placeholder="trigger (ej: precio, horario, ubicacion)"
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sb-primary" />
            <input value={response} onChange={(e) => setResponse(e.target.value)}
              placeholder="Respuesta automática..."
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sb-primary" />
            <button onClick={addResponse}
              className="px-3 py-1.5 bg-sb-primary hover:bg-sb-secondary text-white text-sm rounded transition-colors cursor-pointer">
              Agregar
            </button>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ─── Tab: IA ─────────────────────────────────────────────────────────────────

const emptyPaymentConfig = { accountNumber: '', accountType: 'savings', bankName: '', accountHolder: '', confirmationMethod: 'manual', qrImageUrl: '' }
const emptySalesConfig = { requireCustomerName: false, requireCustomerAddress: false, requireCustomerId: false, deliveryType: 'both', deliveryFee: 0, confirmationInstructions: '' }
const emptyBusinessAddress = { street: '', city: '', state: '', reference: '', postalCode: '' }

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-sb-primary' : 'bg-gray-200'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 leading-tight">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

function IATab({ tenantId, config, onSave, saving }) {
  const [form, setForm] = useState({
    aiInstructions: config?.aiInstructions ?? '',
    allowedActions: config?.allowedActions ?? [],
    restrictions: config?.restrictions ?? [],
    paymentMethods: config?.paymentMethods ?? [],
    location: config?.location ?? '',
    businessAddress: config?.businessAddress ?? emptyBusinessAddress,
    paymentConfig: config?.paymentConfig ?? emptyPaymentConfig,
    salesConfig: config?.salesConfig ?? emptySalesConfig,
  })
  const [msg, setMsg] = useState(null)
  const [qrFile, setQrFile] = useState(null)
  const [qrPreview, setQrPreview] = useState(config?.paymentConfig?.qrImageUrl || null)
  const [qrUploading, setQrUploading] = useState(false)

  useEffect(() => {
    if (config) setForm({
      aiInstructions: config.aiInstructions ?? '',
      allowedActions: config.allowedActions ?? [],
      restrictions: config.restrictions ?? [],
      paymentMethods: config.paymentMethods ?? [],
      location: config.location ?? '',
      businessAddress: config.businessAddress ?? emptyBusinessAddress,
      paymentConfig: config.paymentConfig ?? emptyPaymentConfig,
      salesConfig: config.salesConfig ?? emptySalesConfig,
    })
    setQrPreview(config?.paymentConfig?.qrImageUrl || null)
  }, [config])

  const setPC = (field, val) => setForm(f => ({ ...f, paymentConfig: { ...f.paymentConfig, [field]: val } }))
  const setSC = (field, val) => setForm(f => ({ ...f, salesConfig: { ...f.salesConfig, [field]: val } }))
  const setBA = (field, val) => setForm(f => ({ ...f, businessAddress: { ...f.businessAddress, [field]: val } }))

  const handleQrChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setQrFile(file)
    setQrPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setMsg(null)
    let finalForm = form
    // Upload QR image if a new file was selected
    if (qrFile) {
      setQrUploading(true)
      try {
        const { tenantsApi } = await import('../api')
        const result = await tenantsApi.uploadPaymentQr(tenantId, qrFile)
        // Build updated form immediately (don't rely on async state update)
        finalForm = { ...form, paymentConfig: { ...form.paymentConfig, qrImageUrl: result.qrImageUrl } }
        setForm(finalForm)
        setQrFile(null)
      } catch (err) {
        setMsg({ type: 'error', text: 'Error al subir imagen QR: ' + (err?.response?.data?.message || err.message) })
        setQrUploading(false)
        return
      }
      setQrUploading(false)
    }
    onSave(finalForm, setMsg)
  }

  return (
    <Section
      title="Comportamiento de la IA"
      description="Prompt base, acciones permitidas, ubicación y configuración de ventas"
      onSave={handleSave}
      saving={saving || qrUploading}
      msg={msg}
    >
      <div className="space-y-6">
        {/* AI Instructions */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Instrucciones base para la IA</label>
          <textarea
            value={form.aiInstructions}
            onChange={(e) => setForm((f) => ({ ...f, aiInstructions: e.target.value }))}
            rows={6}
            placeholder="Eres el asistente de [Negocio]. Tu objetivo es ayudar a los clientes con información sobre productos, horarios y soporte. Siempre sé amable y profesional..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">{form.aiInstructions.length} caracteres</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">Acciones permitidas</label>
          <TagInput
            tags={form.allowedActions}
            onChange={(tags) => setForm((f) => ({ ...f, allowedActions: tags }))}
            placeholder="Ej: informar precios, tomar pedidos..."
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">Restricciones (lo que la IA NO puede hacer)</label>
          <TagInput
            tags={form.restrictions}
            onChange={(tags) => setForm((f) => ({ ...f, restrictions: tags }))}
            placeholder="Ej: prometer descuentos, dar datos personales..."
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-2">Métodos de pago aceptados</label>
          <TagInput
            tags={form.paymentMethods}
            onChange={(tags) => setForm((f) => ({ ...f, paymentMethods: tags }))}
            placeholder="Nequi, Bancolombia, efectivo..."
          />
        </div>

        {/* Business Address */}
        <div className="border-t pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ubicación del negocio</p>
          <p className="text-xs text-gray-400 mb-4">Dirección completa que la IA usará al responder preguntas sobre ubicación o puntos de recogida.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Dirección (Calle, Carrera, Av.)</label>
              <input
                value={form.businessAddress.street}
                onChange={e => setBA('street', e.target.value)}
                placeholder="Cra 7 #32-16, Local 205"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
              <input
                value={form.businessAddress.city}
                onChange={e => setBA('city', e.target.value)}
                placeholder="Bogotá"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Departamento / Estado</label>
              <input
                value={form.businessAddress.state}
                onChange={e => setBA('state', e.target.value)}
                placeholder="Cundinamarca"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Punto de referencia</label>
              <input
                value={form.businessAddress.reference}
                onChange={e => setBA('reference', e.target.value)}
                placeholder="Frente al parque principal, en el centro comercial El Éxito"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Código postal (opcional)</label>
              <input
                value={form.businessAddress.postalCode}
                onChange={e => setBA('postalCode', e.target.value)}
                placeholder="110111"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
          </div>
        </div>

        {/* Payment Config */}
        <div className="border-t pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Configuración de pagos</p>
          <p className="text-xs text-gray-400 mb-4">Datos bancarios para que la IA indique al cliente cómo transferir. Puedes subir el QR de Nequi, Bancolombia, etc.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Número de cuenta / celular</label>
              <input
                value={form.paymentConfig.accountNumber}
                onChange={e => setPC('accountNumber', e.target.value)}
                placeholder="3001234567 o 123456789-0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entidad bancaria / billetera</label>
              <input
                value={form.paymentConfig.bankName}
                onChange={e => setPC('bankName', e.target.value)}
                placeholder="Bancolombia, Nequi, Davivienda..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Titular de la cuenta</label>
              <input
                value={form.paymentConfig.accountHolder}
                onChange={e => setPC('accountHolder', e.target.value)}
                placeholder="Nombre completo del titular"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de cuenta</label>
              <select
                value={form.paymentConfig.accountType}
                onChange={e => setPC('accountType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary bg-white"
              >
                <option value="savings">Ahorros</option>
                <option value="checking">Corriente</option>
              </select>
            </div>
          </div>

          {/* QR Image Upload */}
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-2">Imagen QR de pago (Nequi, Bancolombia, etc.)</label>
            <div className="flex items-start gap-4">
              {qrPreview && (
                <div className="flex-shrink-0">
                  <img src={qrPreview} alt="QR de pago" className="w-24 h-24 object-contain border border-gray-200 rounded-lg bg-white p-1" />
                </div>
              )}
              <div className="flex-1">
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-sb-primary transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-xs text-gray-500">
                    {qrFile ? qrFile.name : (qrPreview ? 'Cambiar imagen QR' : 'Subir imagen QR')}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleQrChange} />
                </label>
                <p className="text-xs text-gray-400 mt-1.5">La IA enviará esta imagen al cliente cuando pida instrucciones de pago. Máx. 5 MB.</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-2">Método de confirmación de pago</label>
            <div className="flex gap-3">
              {[
                { val: 'manual', label: 'Manual', desc: 'El cliente envía foto del comprobante por WhatsApp' },
                { val: 'automatic', label: 'Automática', desc: 'Pasarela de pago (próximamente)' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setPC('confirmationMethod', opt.val)}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                    form.paymentConfig.confirmationMethod === opt.val
                      ? 'border-sb-primary bg-sb-primary/5 text-sb-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sales Config */}
        <div className="border-t pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Configuración de ventas</p>
          <p className="text-xs text-gray-400 mb-4">Define qué datos debe recopilar la IA al confirmar una venta y las condiciones del servicio.</p>

          <div className="space-y-4">
            <p className="text-xs font-medium text-gray-600">Datos que la IA debe pedir al cliente al confirmar una compra:</p>
            <div className="space-y-3 pl-1">
              <Toggle
                checked={form.salesConfig.requireCustomerName}
                onChange={v => setSC('requireCustomerName', v)}
                label="Nombre completo del cliente"
                description="La IA pedirá el nombre completo antes de confirmar la venta"
              />
              <Toggle
                checked={form.salesConfig.requireCustomerAddress}
                onChange={v => setSC('requireCustomerAddress', v)}
                label="Dirección de entrega"
                description="La IA pedirá dirección completa (barrio, ciudad, referencia)"
              />
              <Toggle
                checked={form.salesConfig.requireCustomerId}
                onChange={v => setSC('requireCustomerId', v)}
                label="Cédula / Documento de identidad"
                description="Requerido para domicilios o envíos que necesiten verificar identidad"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Modalidad de entrega</label>
                <select
                  value={form.salesConfig.deliveryType}
                  onChange={e => setSC('deliveryType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary bg-white"
                >
                  <option value="pickup">Solo recogida en tienda</option>
                  <option value="delivery">Solo domicilio</option>
                  <option value="both">Ambas (recogida y domicilio)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Costo de domicilio (COP)</label>
                <input
                  type="number"
                  min="0"
                  value={form.salesConfig.deliveryFee}
                  onChange={e => setSC('deliveryFee', Number(e.target.value))}
                  placeholder="0 = gratis"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Instrucciones adicionales para la IA al confirmar ventas</label>
              <textarea
                value={form.salesConfig.confirmationInstructions}
                onChange={e => setSC('confirmationInstructions', e.target.value)}
                rows={3}
                placeholder="Ej: Después de confirmar el pago, indica al cliente que el tiempo de entrega es de 2-3 días hábiles. Solicitar barrio y ciudad de entrega obligatoriamente."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary resize-y"
              />
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ─── Tab: Agentes Humanos ─────────────────────────────────────────────────────

function AgentesTab({ config, onSave, saving }) {
  const [agents, setAgents] = useState(config?.humanAgents ?? [])
  const [newAgent, setNewAgent] = useState({ name: '', phone: '', available: true })
  const [msg, setMsg] = useState(null)

  const handleToggle = (idx) => {
    const updated = agents.map((a, i) => i === idx ? { ...a, available: !a.available } : a)
    setAgents(updated)
  }

  const handleRemove = (idx) => {
    setAgents(agents.filter((_, i) => i !== idx))
  }

  const handleAdd = () => {
    if (!newAgent.name.trim() || !newAgent.phone.trim()) return
    setAgents([...agents, { ...newAgent, name: newAgent.name.trim(), phone: newAgent.phone.trim() }])
    setNewAgent({ name: '', phone: '', available: true })
  }

  const handleSave = () => { setMsg(null); onSave({ humanAgents: agents }, setMsg) }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Agentes Humanos</h3>
          <p className="text-xs text-gray-500 mt-0.5">Cuando un cliente solicite hablar con una persona, el sistema verificará si hay agentes disponibles y notificará por email.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="text-xs bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      {msg && <p className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      {/* Agents list */}
      {agents.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center border-2 border-dashed border-gray-200 rounded-lg">No hay agentes configurados. Agrega uno abajo.</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{agent.name}</p>
                <p className="text-xs text-gray-500">+{agent.phone}</p>
              </div>
              <button
                onClick={() => handleToggle(idx)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${agent.available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${agent.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                {agent.available ? 'Disponible' : 'No disponible'}
              </button>
              <button onClick={() => handleRemove(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new agent */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Agregar agente</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text" placeholder="Nombre del agente" value={newAgent.name}
            onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <input
            type="text" placeholder="Teléfono (ej: 573001234567)" value={newAgent.phone}
            onChange={e => setNewAgent(a => ({ ...a, phone: e.target.value }))}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <button
            onClick={handleAdd} disabled={!newAgent.name.trim() || !newAgent.phone.trim()}
            className="text-xs bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors whitespace-nowrap sm:self-start"
          >
            + Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Appointment Config (empleados para agendamiento) ──────────────────────

function AgendamientoSection({ config, onSave, saving }) {
  const emptyApptConfig = { enabled: false, serviceDurationMinutes: 60, services: [], employees: [] }
  const [form, setForm] = useState(config?.appointmentConfig ?? emptyApptConfig)
  const [newEmp, setNewEmp] = useState({ name: '', calendarId: '', available: true })
  const [newService, setNewService] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (config) setForm(config.appointmentConfig ?? emptyApptConfig)
  }, [config])

  const handleSave = () => {
    setMsg(null)
    onSave({ appointmentConfig: form }, setMsg)
  }

  const addEmployee = () => {
    if (!newEmp.name.trim()) return
    setForm(f => ({ ...f, employees: [...(f.employees || []), { ...newEmp, name: newEmp.name.trim(), calendarId: newEmp.calendarId.trim(), services: [] }] }))
    setNewEmp({ name: '', calendarId: '', available: true })
  }

  const toggleEmployee = (idx) => setForm(f => ({ ...f, employees: f.employees.map((e, i) => i === idx ? { ...e, available: !e.available } : e) }))
  const removeEmployee = (idx) => setForm(f => ({ ...f, employees: f.employees.filter((_, i) => i !== idx) }))

  const addService = () => {
    if (!newService.trim() || (form.services || []).includes(newService.trim())) return
    setForm(f => ({ ...f, services: [...(f.services || []), newService.trim()] }))
    setNewService('')
  }
  const removeService = (s) => setForm(f => ({ ...f, services: f.services.filter(x => x !== s) }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Agendamiento de Citas</h3>
          <p className="text-xs text-gray-400 mt-0.5">Configura empleados y servicios para el agendamiento automático con Google Calendar y Sheets.</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <p className={`text-xs ${msg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{msg.text}</p>}
          <Button size="sm" loading={saving} onClick={handleSave}>Guardar</Button>
        </div>
      </div>

      {/* Enabled toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={form.enabled ?? false} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
            <div className={`w-9 h-5 rounded-full transition-colors ${form.enabled ? 'bg-sb-primary' : 'bg-gray-200'}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.enabled ? 'translate-x-4' : ''}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">Módulo de agendamiento activo</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Duración por defecto:</label>
          <input
            type="number" min="15" max="480" step="15"
            value={form.serviceDurationMinutes ?? 60}
            onChange={e => setForm(f => ({ ...f, serviceDurationMinutes: Number(e.target.value) }))}
            className="w-20 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-sb-primary"
          />
          <span className="text-xs text-gray-400">min</span>
        </div>
      </div>

      {/* Services */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Servicios disponibles</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(form.services || []).map(s => (
            <span key={s} className="flex items-center gap-1 bg-sb-primary/10 text-sb-primary text-xs px-2 py-1 rounded-full">
              {s}
              <button type="button" onClick={() => removeService(s)} className="text-sb-neutral hover:text-red-500">×</button>
            </span>
          ))}
          {(form.services || []).length === 0 && <span className="text-xs text-gray-400">Sin servicios — la IA aceptará cualquier tipo de cita</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={newService}
            onChange={e => setNewService(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addService() } }}
            placeholder="Ej: Corte de cabello, Consulta médica..."
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sb-primary"
          />
          <button type="button" onClick={addService} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors">Agregar</button>
        </div>
      </div>

      {/* Employees */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1">Empleados que prestan el servicio</p>
        <p className="text-xs text-gray-400 mb-3">
          Cada empleado puede tener su propio calendario de Google (deja en blanco para usar el calendario principal).
          Las citas se distribuyen de forma equitativa entre los empleados disponibles.
        </p>

        {(form.employees || []).length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center border-2 border-dashed border-gray-200 rounded-lg">
            Sin empleados — se usará un calendario compartido sin asignación individual.
          </p>
        ) : (
          <div className="space-y-2 mb-3">
            {(form.employees || []).map((emp, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                  {emp.calendarId && <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{emp.calendarId}</p>}
                  {!emp.calendarId && <p className="text-xs text-gray-400 mt-0.5">Calendario principal de Google</p>}
                </div>
                <button
                  onClick={() => toggleEmployee(idx)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${emp.available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${emp.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {emp.available ? 'Disponible' : 'No disponible'}
                </button>
                <button onClick={() => removeEmployee(idx)} className="text-gray-400 hover:text-red-500 transition-colors mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add employee */}
        <div className="border border-dashed border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Agregar empleado</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text" placeholder="Nombre del empleado *" value={newEmp.name}
              onChange={e => setNewEmp(n => ({ ...n, name: e.target.value }))}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <input
              type="text" placeholder="ID del calendario (opcional)" value={newEmp.calendarId}
              onChange={e => setNewEmp(n => ({ ...n, calendarId: e.target.value }))}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono"
            />
            <button
              onClick={addEmployee} disabled={!newEmp.name.trim()}
              className="text-xs bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              + Agregar
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            El ID del calendario se encuentra en Google Calendar → Configuración del calendario → ID del calendario (ej: <code>nombre@gmail.com</code> o una cadena aleatoria).
          </p>
        </div>
      </div>
    </div>
  )
}


// ─── Tab: Referencias ────────────────────────────────────────────────────────

const REF_TYPE_ICONS = {
  web: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  api: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  document: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
}

const REF_TYPES = [
  { value: 'web',      label: 'Página web',       desc: 'Tienda online, landing page, catálogo web' },
  { value: 'api',      label: 'API externa',       desc: 'Endpoint REST que devuelve datos del negocio' },
  { value: 'document', label: 'Documento / Drive', desc: 'PDF, CSV, Notion, Google Drive' },
]

const FREQ_OPTIONS = [
  { value: 'manual',  label: 'Manual (solo cuando lo activo)' },
  { value: 'hourly',  label: 'Cada hora' },
  { value: 'daily',   label: 'Una vez al día' },
  { value: 'weekly',  label: 'Una vez a la semana' },
]

const EMPTY_FORM = { name: '', type: 'web', url: '', description: '', updateFrequency: 'daily', categories: [], isActive: true }

function ReferencesTab({ tenantId }) {
  const { data: refs = [], isLoading } = useReferences(tenantId)
  const create  = useCreateReference(tenantId)
  const update  = useUpdateReference(tenantId)
  const remove  = useDeleteReference(tenantId)

  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [catInput, setCatInput]   = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [msg, setMsg]             = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const addCat = () => {
    const val = catInput.trim()
    if (val && !form.categories.includes(val)) setForm((f) => ({ ...f, categories: [...f.categories, val] }))
    setCatInput('')
  }

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setMsg(null); setShowForm(true) }
  const openEdit   = (ref) => {
    setForm({ name: ref.name, type: ref.type, url: ref.url, description: ref.description || '', updateFrequency: ref.updateFrequency || 'daily', categories: ref.categories || [], isActive: ref.isActive })
    setEditingId(ref._id)
    setMsg(null)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.url.trim()) { setMsg({ type: 'error', text: 'Nombre y URL son requeridos' }); return }
    setMsg(null)
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, data: form })
      } else {
        await create.mutateAsync(form)
      }
      setShowForm(false)
      setEditingId(null)
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Error al guardar' })
    }
  }

  const handleToggle = async (ref) => {
    try { await update.mutateAsync({ id: ref._id, data: { isActive: !ref.isActive } }) } catch {}
  }

  const handleDelete = async (id) => {
    try { await remove.mutateAsync(id) } catch {}
    setConfirmId(null)
  }

  const typeInfo = (t) => REF_TYPES.find((r) => r.value === t) || REF_TYPES[0]
  const typeIcon = (t) => REF_TYPE_ICONS[t] || REF_TYPE_ICONS.web
  const isSaving = create.isPending || update.isPending

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Referencias del negocio</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Conecta páginas web, APIs y documentos del negocio para que la IA responda con información real y actualizada de tus productos y servicios.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-sb-primary hover:bg-sb-secondary text-white text-xs font-medium rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar referencia
          </button>
        </div>

        {/* How it works */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: '1', title: 'Registras la fuente', desc: 'URL de tu tienda, catálogo o API del negocio', color: 'bg-blue-50 text-blue-600' },
            { step: '2', title: 'n8n extrae los datos', desc: 'Scrapea o consulta la fuente automáticamente', color: 'bg-purple-50 text-purple-600' },
            { step: '3', title: 'IA responde con datos reales', desc: '"Tenemos camisa Oxford Blanca a $89,000"', color: 'bg-green-50 text-green-600' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.color}`}>{s.step}</div>
              <div>
                <p className="text-xs font-medium text-gray-700">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form inline */}
      {showForm && (
        <div className="bg-white rounded-xl border border-sb-primary/30 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">{editingId ? 'Editar referencia' : 'Nueva referencia'}</h3>

          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {REF_TYPES.map((t) => (
              <button key={t.value} type="button"
                onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${form.type === t.value ? 'border-sb-primary bg-sb-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className={`mb-1.5 ${form.type === t.value ? 'text-sb-primary' : 'text-gray-400'}`}>
                  {REF_TYPE_ICONS[t.value]}
                </div>
                <p className={`text-xs font-medium ${form.type === t.value ? 'text-sb-primary' : 'text-gray-700'}`}>{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre de la referencia <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={set('name')} placeholder="Tienda web principal"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Frecuencia de actualización</label>
              <select value={form.updateFrequency} onChange={set('updateFrequency')} className={selectCls}>
                {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">URL / Endpoint <span className="text-red-400">*</span></label>
              <input value={form.url} onChange={set('url')} placeholder="https://mitienda.com/productos"
                className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Descripción (opcional)</label>
              <input value={form.description} onChange={set('description')} placeholder="Catálogo completo de ropa para mujer y hombre"
                className={inputCls} />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Categorías (opcional)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.categories.map((c) => (
                <span key={c} className="flex items-center gap-1 bg-sb-primary/10 text-sb-primary text-xs px-2 py-0.5 rounded-full">
                  {c}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, categories: f.categories.filter((x) => x !== c) }))} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={catInput} onChange={(e) => setCatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCat() } }}
                placeholder="ej: camisas, precios, disponibilidad..."
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sb-primary" />
              <button type="button" onClick={addCat} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 rounded-lg">Agregar</button>
            </div>
          </div>

          <InlineMsg msg={msg} />

          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={isSaving}
              className="px-5 py-2 bg-sb-primary hover:bg-sb-secondary disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {isSaving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear referencia'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* References list */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <div className="w-6 h-6 border-2 border-sb-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : refs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <div className="flex justify-center mb-3">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Sin referencias configuradas</p>
          <p className="text-xs text-gray-400">Agrega la URL de tu tienda o catálogo para que la IA pueda responder basándose en tus productos reales.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {refs.map((ref) => {
            const ti = typeInfo(ref.type)
            return (
              <div key={ref._id} className={`bg-white rounded-xl border p-4 transition-colors ${ref.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                    {typeIcon(ref.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{ref.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ref.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ref.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{ti.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{ref.url}</p>
                    {ref.description && <p className="text-xs text-gray-500 mt-1">{ref.description}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {ref.categories?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {ref.categories.map((c) => (
                            <span key={c} className="text-xs bg-sb-primary/8 text-sb-primary px-1.5 py-0.5 rounded">{c}</span>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-gray-400">
                        {FREQ_OPTIONS.find((f) => f.value === ref.updateFrequency)?.label || ref.updateFrequency}
                      </span>
                      {ref.lastFetched && (
                        <span className="text-xs text-gray-400">
                          Última actualización: {new Date(ref.lastFetched).toLocaleDateString('es-CO')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle active */}
                    <button onClick={() => handleToggle(ref)} title={ref.isActive ? 'Desactivar' : 'Activar'}
                      className="p-1.5 text-gray-400 hover:text-sb-primary rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {ref.isActive
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                        }
                      </svg>
                    </button>
                    {/* Edit */}
                    <button onClick={() => openEdit(ref)} title="Editar"
                      className="p-1.5 text-gray-400 hover:text-sb-primary rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Delete */}
                    {confirmId === ref._id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(ref._id)} className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">Sí</button>
                        <button onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(ref._id)} title="Eliminar"
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* n8n instruction tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">Cómo usa n8n estas referencias</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Cuando un cliente pregunta por un producto o servicio, n8n consulta automáticamente las referencias activas, extrae la información relevante y la IA genera una respuesta personalizada basada en datos reales de tu negocio — sin inventar información.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Tab: Canales ─────────────────────────────────────────────────────────────

const API_BASE = 'https://api.sharkbyteia.com'
const N8N_BASE = 'https://n8n.sharkbyteia.com'

const PLATFORMS = [
  {
    id: 'facebook',
    label: 'Facebook Messenger',
    color: 'bg-blue-600',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
      </svg>
    ),
    fields: [
      { key: 'pageId', label: 'Page ID', placeholder: '123456789012345', hint: 'ID numérico de tu Página de Facebook' },
      { key: 'accessToken', label: 'Page Access Token', placeholder: 'EAABwz...', hint: 'Token de larga duración de tu Página', secret: true },
      { key: 'appSecret', label: 'App Secret', placeholder: 'abc123def456...', hint: 'Secret de tu app Meta', secret: true },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', placeholder: 'mi_token_secreto_fb', hint: 'Token que configurarás en Meta Developers para verificar el webhook' },
      { key: 'n8nWebhookUrl', label: 'URL Webhook n8n', placeholder: `${N8N_BASE}/webhook/facebook-handler`, hint: 'URL del workflow n8n (ya desplegado en producción)', defaultValue: `${N8N_BASE}/webhook/facebook-handler` },
    ],
    webhookUrl: `${API_BASE}/webhooks/meta`,
    setupSteps: [
      'Crea una app en developers.facebook.com',
      'Agrega el producto "Messenger" a la app',
      'Genera un Page Access Token de larga duración',
      `En "Webhooks", configura la URL: ${API_BASE}/webhooks/meta`,
      'Usa el Verify Token que configuraste en el campo de arriba',
      'Suscríbete al evento: messages',
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram Direct',
    color: 'bg-gradient-to-br from-purple-600 to-pink-500',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    fields: [
      { key: 'instagramAccountId', label: 'Instagram Account ID', placeholder: '17841234567890123', hint: 'ID de tu cuenta de Instagram Business' },
      { key: 'accessToken', label: 'Page Access Token', placeholder: 'EAABwz...', hint: 'Token de la Página de Facebook vinculada', secret: true },
      { key: 'appSecret', label: 'App Secret', placeholder: 'abc123def456...', hint: 'Secret de tu app Meta', secret: true },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', placeholder: 'mi_token_secreto_ig', hint: 'Token configurado en Meta Developers para verificar el webhook' },
      { key: 'n8nWebhookUrl', label: 'URL Webhook n8n', placeholder: `${N8N_BASE}/webhook/instagram-handler`, hint: 'URL del workflow n8n (ya desplegado en producción)', defaultValue: `${N8N_BASE}/webhook/instagram-handler` },
    ],
    webhookUrl: `${API_BASE}/webhooks/meta`,
    setupSteps: [
      'Vincula tu cuenta Instagram a una Página de Facebook',
      'En tu app Meta, agrega los productos "Messenger" e "Instagram"',
      'Activa la suscripción "messages" en Instagram Webhooks',
      `Configura la URL de webhook: ${API_BASE}/webhooks/meta`,
      'Copia el Instagram Account ID desde el panel de la app',
    ],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    color: 'bg-sky-500',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
      </svg>
    ),
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '123456789:ABCdef...', hint: 'Token obtenido de @BotFather — el webhook se registrará automáticamente', secret: true },
      { key: 'botUsername', label: 'Username del Bot', placeholder: '@MiTiendaBot', hint: 'Nombre de usuario del bot (con @)' },
      { key: 'n8nWebhookUrl', label: 'URL Webhook n8n', placeholder: `${N8N_BASE}/webhook/telegram-handler`, hint: 'URL del workflow n8n (ya desplegado en producción)', defaultValue: `${N8N_BASE}/webhook/telegram-handler` },
    ],
    webhookUrl: (token) => `${API_BASE}/webhooks/telegram/${token || '{botToken}'}`,
    setupSteps: [
      'Abre Telegram y busca @BotFather',
      'Envía /newbot y sigue las instrucciones',
      'Copia el token que te entrega BotFather',
      'Pégalo aquí y guarda — el webhook se registra automáticamente',
      'Los clientes pueden escribir al bot directamente',
    ],
  },
  {
    id: 'tiktok',
    label: 'TikTok Messages',
    color: 'bg-gray-900',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" />
      </svg>
    ),
    fields: [
      { key: 'tiktokAccountId', label: 'TikTok Account ID (open_id)', placeholder: 'abc123xyz...', hint: 'open_id de tu cuenta TikTok Business' },
      { key: 'tiktokAccessToken', label: 'Access Token', placeholder: 'act.abc123...', hint: 'Token con permisos DM de TikTok Business API', secret: true },
      { key: 'n8nWebhookUrl', label: 'URL Webhook n8n', placeholder: `${N8N_BASE}/webhook/tiktok-handler`, hint: 'URL del workflow n8n (ya desplegado en producción)', defaultValue: `${N8N_BASE}/webhook/tiktok-handler` },
    ],
    webhookUrl: `${API_BASE}/webhooks/tiktok`,
    setupSteps: [
      'Crea una app en developers.tiktok.com',
      'Habilita la API de mensajes directos (DM)',
      `Registra el webhook: ${API_BASE}/webhooks/tiktok`,
      'Obtén el open_id de tu cuenta de negocio',
      'Genera un access token con permisos de mensajería',
    ],
  },
]

const inputClsCh = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary bg-white'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="ml-1.5 text-xs text-gray-400 hover:text-sb-primary transition-colors shrink-0"
      title="Copiar"
    >
      {copied ? '✓' : '⎘'}
    </button>
  )
}

function ChannelCard({ platform, tenantId, channelData }) {
  const [open, setOpen] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  // Build default n8n URL from platform definition
  const defaultN8nUrl = platform.fields.find(f => f.key === 'n8nWebhookUrl')?.defaultValue ?? ''

  const [form, setForm] = useState({
    platform: platform.id,
    isActive: true,
    displayName: '',
    pageId: '', instagramAccountId: '', accessToken: '', appSecret: '',
    webhookVerifyToken: '', botToken: '', botUsername: '',
    tiktokAccessToken: '', tiktokAccountId: '',
    n8nWebhookUrl: defaultN8nUrl,
    ...channelData,
  })
  const [showSecrets, setShowSecrets] = useState({})
  const [saved, setSaved] = useState(false)
  const upsert = useUpsertChannel(tenantId)
  const remove = useDeleteChannel(tenantId)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Sync channelData when it loads
  useEffect(() => {
    if (channelData) {
      setForm((f) => ({
        ...f,
        ...channelData,
        n8nWebhookUrl: channelData.n8nWebhookUrl || defaultN8nUrl,
      }))
    }
  }, [channelData])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const isConnected = !!channelData

  const handleSave = async () => {
    await upsert.mutateAsync(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setOpen(false)
  }

  const handleDelete = async () => {
    await remove.mutateAsync(platform.id)
    setConfirmDelete(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platform.color}`}>
            {platform.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{platform.label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {isConnected
                ? (form.isActive ? 'Conectado y activo' : 'Conectado — inactivo')
                : 'No configurado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {form.isActive ? 'Activo' : 'Inactivo'}
            </span>
          )}
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="text-xs text-gray-400 hover:text-sb-primary transition-colors px-2 py-1 rounded"
          >
            Guía
          </button>
          {isConnected && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded"
            >
              Desconectar
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Confirmar</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 px-2 py-1 rounded hover:text-gray-600">Cancelar</button>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="text-xs bg-sb-primary text-white px-3 py-1.5 rounded-lg hover:bg-sb-primary/90 transition-colors"
          >
            {isConnected ? 'Editar' : 'Configurar'}
          </button>
        </div>
      </div>

      {/* Setup guide */}
      {showSetup && (
        <div className="mx-5 mb-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-2">Pasos de configuración</p>
          <ol className="space-y-1">
            {platform.setupSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-600">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-center leading-5 font-medium">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-3 bg-white rounded border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500 font-medium mb-1">URL del webhook (copia y pega en el portal):</p>
            <div className="flex items-center gap-1 flex-wrap">
              <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs break-all">
                {typeof platform.webhookUrl === 'function'
                  ? platform.webhookUrl(form.botToken)
                  : platform.webhookUrl}
              </code>
              <CopyButton text={typeof platform.webhookUrl === 'function' ? platform.webhookUrl(form.botToken) : platform.webhookUrl} />
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {open && (
        <div className="border-t border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-600">Credenciales del canal</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-500">Activo</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-sb-primary"
              />
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre del canal (opcional)</label>
            <input value={form.displayName} onChange={set('displayName')} placeholder="ej. Mi Tienda Oficial" className={inputClsCh} />
          </div>
          {platform.fields.map((field) => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">{field.label}</label>
                {field.key === 'n8nWebhookUrl' && form[field.key] && (
                  <CopyButton text={form[field.key]} />
                )}
              </div>
              <div className="relative">
                <input
                  type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                  value={form[field.key] ?? ''}
                  onChange={set(field.key)}
                  placeholder={field.placeholder}
                  className={inputClsCh + (field.secret ? ' pr-14' : '')}
                />
                {field.secret && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets((s) => ({ ...s, [field.key]: !s[field.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets[field.key] ? 'Ocultar' : 'Ver'}
                  </button>
                )}
              </div>
              {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2 rounded-lg">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={upsert.isPending}
              className="text-sm bg-sb-primary text-white px-4 py-2 rounded-lg hover:bg-sb-primary/90 disabled:opacity-50"
            >
              {upsert.isPending ? 'Guardando...' : saved ? 'Guardado' : 'Guardar canal'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {isConnected && channelData.messagesProcessed > 0 && (
        <div className="border-t border-gray-50 px-5 py-3 flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-400">Mensajes procesados</p>
            <p className="text-sm font-semibold text-gray-700">{channelData.messagesProcessed?.toLocaleString()}</p>
          </div>
          {channelData.lastActive && (
            <div>
              <p className="text-xs text-gray-400">Última actividad</p>
              <p className="text-sm text-gray-600">{new Date(channelData.lastActive).toLocaleDateString('es-CO')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CanalesTab({ tenantId }) {
  const { data: channels = [], isLoading } = useChannels(tenantId)

  const channelMap = channels.reduce((acc, ch) => {
    acc[ch.platform] = ch
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-sm">Multi-Canal con IA</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Conecta Facebook Messenger, Instagram DMs, Telegram y TikTok. La misma IA que responde en WhatsApp atenderá a tus clientes en todos los canales configurados.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Canales disponibles', value: '4' },
            { label: 'Conectados', value: channels.filter(c => c.isActive).length },
            { label: 'Mensajes totales', value: channels.reduce((s, c) => s + (c.messagesProcessed || 0), 0).toLocaleString() },
            { label: 'IA compartida', value: 'Sí' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-300">{stat.label}</p>
              <p className="text-lg font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* n8n info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
        <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs text-green-900 leading-relaxed">
          <strong>Workflows desplegados.</strong> Los 4 workflows de IA ya están activos en producción (n8n.sharkbyteia.com). Las URLs de webhook n8n están pre-configuradas — solo ingresa tus credenciales de cada plataforma y guarda.
        </div>
      </div>

      {/* Channel cards */}
      <div className="space-y-4">
        {PLATFORMS.map((platform) => (
          <ChannelCard
            key={platform.id}
            platform={platform}
            tenantId={tenantId}
            channelData={channelMap[platform.id] || null}
          />
        ))}
      </div>
    </div>
  )
}

const TABS = ['Identidad', 'Comunicación', 'Operaciones', 'Automatizaciones', 'IA', 'Agentes', 'Referencias', 'Canales']

export default function BusinessConfigPage({ tenantIdOverride } = {}) {
  const { tenantId: paramId } = useParams()
  const tenantId = tenantIdOverride ?? paramId
  const navigate = useNavigate()
  const { data: config, isLoading, error } = useBusinessConfig(tenantId)
  const { data: tenant } = useTenant(tenantId)
  const upsert = useUpsertBusinessConfig()
  const [activeTab, setActiveTab] = useState(0)

  const isConfigMissing = error?.response?.status === 404 || !config

  const handleSave = (data, setMsg) => {
    upsert.mutate(
      { tenantId, data },
      {
        onSuccess: () => setMsg({ type: 'success', text: 'Guardado correctamente' }),
        onError: (err) => {
          const raw = err.response?.data?.message
          const text = Array.isArray(raw)
            ? 'Error de validación. Verifica los datos ingresados.'
            : (raw ?? 'Error al guardar')
          setMsg({ type: 'error', text })
        },
      }
    )
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/tenants/${tenantId}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al tenant
          </button>
          <span className="text-gray-200">/</span>
          <h1 className="text-sm font-semibold text-gray-800">Configuración del Negocio</h1>
        </div>
        <Badge variant={config?.isComplete ? 'active' : 'inactive'}>
          {config?.isComplete ? 'Configuración completa' : 'Configuración incompleta'}
        </Badge>
      </div>

      {isConfigMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Este tenant aún no tiene configuración de negocio. Completa los campos y guarda cada sección para activar la IA.
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl min-w-max">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(idx)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === idx
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 0 && <IdentidadTab config={config} onSave={handleSave} saving={upsert.isPending} />}
      {activeTab === 1 && <ComunicacionTab config={config} onSave={handleSave} saving={upsert.isPending} />}
      {activeTab === 2 && <OperacionesTab tenantId={tenantId} config={config} onSave={handleSave} saving={upsert.isPending} />}
      {activeTab === 3 && <AutomatizacionesTab config={config} onSave={handleSave} saving={upsert.isPending} />}
      {activeTab === 4 && <IATab tenantId={tenantId} config={config} onSave={handleSave} saving={upsert.isPending} />}
      {activeTab === 5 && <AgentesTab config={config} onSave={handleSave} saving={upsert.isPending} />}
      {activeTab === 6 && <ReferencesTab tenantId={tenantId} />}
      {activeTab === 7 && <CanalesTab tenantId={tenantId} />}
    </div>
  )
}
