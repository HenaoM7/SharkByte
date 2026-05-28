import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegister, useAuth } from '../hooks'

// ── Helpers ───────────────────────────────────────────────────────────────────
function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-red-600 mt-1">{message}</p>
}

function inputCls(hasError) {
  return `w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-300 focus:ring-red-400 bg-red-50'
      : 'border-gray-200 focus:ring-sb-primary focus:border-sb-primary'
  }`
}

function selectCls() {
  return 'w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-sb-primary transition-colors bg-white'
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full shrink-0 transition-colors ${
          checked ? 'bg-sb-primary' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function CheckboxGroup({ options, selected, onChange }) {
  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val))
    else onChange([...selected, val])
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
            selected.includes(opt.value)
              ? 'border-sb-primary bg-sb-primary/5 text-sb-primary font-medium'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
            selected.includes(opt.value) ? 'bg-sb-primary border-sb-primary' : 'border-gray-300'
          }`}>
            {selected.includes(opt.value) && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Step config ───────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Tu cuenta',        icon: 'user' },
  { id: 2, label: 'Tu negocio',       icon: 'building' },
  { id: 3, label: 'Operación',        icon: 'chart' },
  { id: 4, label: 'Ventas',           icon: 'cash' },
  { id: 5, label: 'Automatización',   icon: 'bolt' },
  { id: 6, label: 'Configuración',    icon: 'settings' },
]

function StepIcon({ icon, active, done }) {
  const icons = {
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    cash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    bolt: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
    settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[icon]}
    </svg>
  )
}

// ── Individual step components ────────────────────────────────────────────────

function Step1({ data, setData, errors }) {
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre <span className="text-red-400">*</span></label>
          <input value={data.firstName} onChange={set('firstName')} placeholder="Juan" className={inputCls(!!errors.firstName)} />
          <FieldError message={errors.firstName} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido</label>
          <input value={data.lastName} onChange={set('lastName')} placeholder="García" className={inputCls(false)} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico <span className="text-red-400">*</span></label>
        <input value={data.email} onChange={set('email')} type="email" placeholder="correo@negocio.com" className={inputCls(!!errors.email)} />
        <FieldError message={errors.email} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Business <span className="text-red-400">*</span></label>
        <input value={data.phone} onChange={set('phone')} placeholder="+573001234567" className={inputCls(!!errors.phone)} />
        <FieldError message={errors.phone} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña <span className="text-red-400">*</span></label>
        <input value={data.password} onChange={set('password')} type="password" placeholder="Mínimo 8 caracteres" className={inputCls(!!errors.password)} />
        <FieldError message={errors.password} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar contraseña <span className="text-red-400">*</span></label>
        <input value={data.confirmPassword} onChange={set('confirmPassword')} type="password" placeholder="••••••••" className={inputCls(!!errors.confirmPassword)} />
        <FieldError message={errors.confirmPassword} />
      </div>
    </div>
  )
}

function Step2({ data, setData, errors }) {
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }))
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del negocio <span className="text-red-400">*</span></label>
        <input value={data.businessName} onChange={set('businessName')} placeholder="Mi Restaurante SAS" className={inputCls(!!errors.businessName)} />
        <FieldError message={errors.businessName} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de negocio</label>
        <select value={data.businessType} onChange={set('businessType')} className={selectCls()}>
          <option value="">Selecciona un tipo...</option>
          <option value="restaurante">Restaurante / Food</option>
          <option value="tienda">Tienda / Retail</option>
          <option value="servicios">Servicios profesionales</option>
          <option value="inmobiliaria">Inmobiliaria</option>
          <option value="salud">Salud y bienestar</option>
          <option value="educacion">Educación</option>
          <option value="logistica">Logística / Transporte</option>
          <option value="tecnologia">Tecnología</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      {data.businessType === 'otro' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">¿Cuál es tu tipo de negocio? <span className="text-red-400">*</span></label>
          <input
            value={data.businessTypeCustom}
            onChange={set('businessTypeCustom')}
            placeholder="Describe brevemente tu negocio..."
            className={inputCls(!!errors.businessTypeCustom)}
          />
          <FieldError message={errors.businessTypeCustom} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
          <input value={data.city} onChange={set('city')} placeholder="Bogotá" className={inputCls(false)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">País</label>
          <select value={data.country} onChange={set('country')} className={selectCls()}>
            <option value="CO">Colombia</option>
            <option value="MX">México</option>
            <option value="AR">Argentina</option>
            <option value="PE">Perú</option>
            <option value="CL">Chile</option>
            <option value="EC">Ecuador</option>
            <option value="VE">Venezuela</option>
            <option value="US">Estados Unidos</option>
            <option value="ES">España</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
        <input value={data.address} onChange={set('address')} placeholder="Calle 123 # 45-67" className={inputCls(false)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tamaño del equipo</label>
        <select value={data.teamSize} onChange={set('teamSize')} className={selectCls()}>
          <option value="">Selecciona...</option>
          <option value="1">Solo yo</option>
          <option value="2-5">2 – 5 personas</option>
          <option value="6-20">6 – 20 personas</option>
          <option value="21-100">21 – 100 personas</option>
          <option value="100+">Más de 100</option>
        </select>
      </div>
    </div>
  )
}

function Step3({ data, setData }) {
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }))
  const setArr = (k) => (val) => setData((d) => ({ ...d, [k]: val }))
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">¿Qué ofrece tu negocio?</label>
        <select value={data.offerType} onChange={set('offerType')} className={selectCls()}>
          <option value="">Selecciona...</option>
          <option value="products">Productos físicos</option>
          <option value="services">Servicios</option>
          <option value="both">Productos y servicios</option>
          <option value="digital">Productos digitales</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Ticket promedio de venta (COP)</label>
        <input value={data.avgTicket} onChange={set('avgTicket')} type="number" min="0" placeholder="150000" className={inputCls(false)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Canales de venta actuales</label>
        <CheckboxGroup
          options={[
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'web', label: 'Sitio web' },
            { value: 'presencial', label: 'Presencial' },
            { value: 'marketplace', label: 'Marketplace' },
            { value: 'telefono', label: 'Teléfono' },
          ]}
          selected={data.salesChannels}
          onChange={setArr('salesChannels')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensajes de WhatsApp por mes (aprox.)</label>
        <select value={data.monthlyVolume} onChange={set('monthlyVolume')} className={selectCls()}>
          <option value="">Selecciona...</option>
          <option value="<100">Menos de 100</option>
          <option value="100-500">100 – 500</option>
          <option value="500-2000">500 – 2,000</option>
          <option value="2000-10000">2,000 – 10,000</option>
          <option value="10000+">Más de 10,000</option>
        </select>
      </div>
    </div>
  )
}

function Step4({ data, setData }) {
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }))
  const setArr = (k) => (val) => setData((d) => ({ ...d, [k]: val }))
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Métodos de pago que aceptas</label>
        <CheckboxGroup
          options={[
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'transferencia', label: 'Transferencia' },
            { value: 'tarjeta', label: 'Tarjeta débito/crédito' },
            { value: 'nequi', label: 'Nequi / Daviplata' },
            { value: 'contraentrega', label: 'Contraentrega' },
            { value: 'credito', label: 'Crédito propio' },
          ]}
          selected={data.paymentMethods}
          onChange={setArr('paymentMethods')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de cliente objetivo</label>
        <select value={data.saleType} onChange={set('saleType')} className={selectCls()}>
          <option value="">Selecciona...</option>
          <option value="b2c">Personas (B2C)</option>
          <option value="b2b">Empresas (B2B)</option>
          <option value="both">Ambos</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Frecuencia de compra del cliente</label>
        <select value={data.purchaseFrequency} onChange={set('purchaseFrequency')} className={selectCls()}>
          <option value="">Selecciona...</option>
          <option value="diario">Diario</option>
          <option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
          <option value="ocasional">Ocasional / único</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Duración promedio del ciclo de venta</label>
        <select value={data.salesCycle} onChange={set('salesCycle')} className={selectCls()}>
          <option value="">Selecciona...</option>
          <option value="inmediato">Inmediato (en la misma conversación)</option>
          <option value="dias">Días</option>
          <option value="semanas">Semanas</option>
          <option value="meses">Meses</option>
        </select>
      </div>
    </div>
  )
}

function Step5({ data, setData }) {
  const setBool = (k) => (val) => setData((d) => ({ ...d, [k]: val }))
  return (
    <div className="space-y-1">
      <p className="text-sm text-gray-500 mb-4">
        Configura las automatizaciones que quieres activar desde el inicio. Puedes ajustarlas después.
      </p>
      <div className="divide-y divide-gray-100">
        <Toggle
          checked={data.autoReply}
          onChange={setBool('autoReply')}
          label="Respuesta automática con IA"
          description="Responde consultas frecuentes sin intervención humana"
        />
        <Toggle
          checked={data.salesAutomation}
          onChange={setBool('salesAutomation')}
          label="Asistente de ventas IA"
          description="Guía a los clientes en el proceso de compra"
        />
        <Toggle
          checked={data.agendaAutomation}
          onChange={setBool('agendaAutomation')}
          label="Agendamiento automático"
          description="Permite a los clientes agendar citas por WhatsApp"
        />
        <Toggle
          checked={data.followUpAutomation}
          onChange={setBool('followUpAutomation')}
          label="Seguimiento automático"
          description="Mensajes de seguimiento a prospectos inactivos"
        />
        <Toggle
          checked={data.escalation}
          onChange={setBool('escalation')}
          label="Escalamiento a agente humano"
          description="Transfiere conversaciones complejas a tu equipo"
        />
      </div>
    </div>
  )
}

function Step6({ data, setData }) {
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }))
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Estos ajustes personalizan cómo SharkByte opera en tu negocio.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Idioma del sistema</label>
        <select value={data.language} onChange={set('language')} className={selectCls()}>
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Zona horaria</label>
        <select value={data.timezone} onChange={set('timezone')} className={selectCls()}>
          <option value="America/Bogota">Colombia (UTC-5)</option>
          <option value="America/Mexico_City">México (UTC-6)</option>
          <option value="America/Lima">Perú (UTC-5)</option>
          <option value="America/Santiago">Chile (UTC-4/-3)</option>
          <option value="America/Buenos_Aires">Argentina (UTC-3)</option>
          <option value="America/Caracas">Venezuela (UTC-4)</option>
          <option value="America/New_York">Este EE.UU. (UTC-5/-4)</option>
          <option value="Europe/Madrid">España (UTC+1/+2)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Moneda principal</label>
        <select value={data.currency} onChange={set('currency')} className={selectCls()}>
          <option value="COP">COP — Peso colombiano</option>
          <option value="MXN">MXN — Peso mexicano</option>
          <option value="PEN">PEN — Sol peruano</option>
          <option value="CLP">CLP — Peso chileno</option>
          <option value="ARS">ARS — Peso argentino</option>
          <option value="USD">USD — Dólar americano</option>
          <option value="EUR">EUR — Euro</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del agente IA</label>
        <input value={data.agentName} onChange={set('agentName')} placeholder="Asistente (ej: Sofía, Bot, etc.)" className={inputCls(false)} />
        <p className="text-xs text-gray-400 mt-1">Nombre con el que la IA se presentará a tus clientes</p>
      </div>
    </div>
  )
}

// ── Validation per step ────────────────────────────────────────────────────────
function validateStep(step, data) {
  const errs = {}
  if (step === 1) {
    if (!data.firstName?.trim()) errs.firstName = 'El nombre es requerido'
    if (!data.email?.trim()) errs.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Correo inválido'
    if (!data.phone?.trim()) errs.phone = 'El número WhatsApp es requerido'
    else if (!data.phone.startsWith('+')) errs.phone = 'Debe comenzar con + (ej: +573001234567)'
    if (!data.password) errs.password = 'La contraseña es requerida'
    else if (data.password.length < 8) errs.password = 'Mínimo 8 caracteres'
    if (data.password !== data.confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden'
  }
  if (step === 2) {
    if (!data.businessName?.trim()) errs.businessName = 'El nombre del negocio es requerido'
    if (data.businessType === 'otro' && !data.businessTypeCustom?.trim()) errs.businessTypeCustom = 'Por favor describe tu tipo de negocio'
  }
  return errs
}

// ── Wizard progress bar ───────────────────────────────────────────────────────
function ProgressBar({ currentStep, total }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const done = step < currentStep
        const active = step === currentStep
        return (
          <div key={step} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${
                done ? 'bg-sb-primary' : active ? 'bg-sb-primary/50' : 'bg-gray-200'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6

export default function RegisterPage() {
  const { register: registerMutation, loading, error } = useRegister()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})

  // Step 1 — account
  const [s1, setS1] = useState({ firstName: '', lastName: '', email: '', phone: '+', password: '', confirmPassword: '' })
  // Step 2 — business
  const [s2, setS2] = useState({ businessName: '', businessType: '', businessTypeCustom: '', city: '', country: 'CO', address: '', teamSize: '' })
  // Step 3 — operations
  const [s3, setS3] = useState({ offerType: '', avgTicket: '', salesChannels: [], monthlyVolume: '' })
  // Step 4 — sales
  const [s4, setS4] = useState({ paymentMethods: [], saleType: '', purchaseFrequency: '', salesCycle: '' })
  // Step 5 — automation
  const [s5, setS5] = useState({ autoReply: true, salesAutomation: true, agendaAutomation: false, followUpAutomation: false, escalation: true })
  // Step 6 — config
  const [s6, setS6] = useState({ language: 'es', timezone: 'America/Bogota', currency: 'COP', agentName: '' })

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const stepData = [s1, s2, s3, s4, s5, s6]
  const stepSetters = [setS1, setS2, setS3, setS4, setS5, setS6]

  const handleNext = () => {
    const errs = validateStep(step, stepData[step - 1])
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setStep((s) => s + 1)
  }

  const handleBack = () => {
    setErrors({})
    setStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    const errs = validateStep(step, stepData[step - 1])
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    try {
      await registerMutation({
        // Campos requeridos
        businessName: s2.businessName,
        phone: s1.phone,
        email: s1.email,
        password: s1.password,
        // Campos opcionales — pre-populan la configuración del negocio
        ...(s2.businessType        && { businessType: s2.businessType }),
        ...(s2.businessTypeCustom  && { businessTypeCustom: s2.businessTypeCustom }),
        ...(s2.city                && { city: s2.city }),
        ...(s2.country             && { country: s2.country }),
        ...(s2.address             && { address: s2.address }),
        ...(s2.teamSize            && { teamSize: s2.teamSize }),
        ...(s6.currency            && { currency: s6.currency }),
        ...(s6.timezone            && { timezone: s6.timezone }),
        ...(s6.language            && { language: s6.language }),
        ...(s6.agentName           && { agentName: s6.agentName }),
        ...(s4.paymentMethods?.length && { paymentMethods: s4.paymentMethods }),
        autoReply:          s5.autoReply,
        salesAutomation:    s5.salesAutomation,
        agendaAutomation:   s5.agendaAutomation,
        followUpAutomation: s5.followUpAutomation,
        escalation:         s5.escalation,
      })
      navigate('/dashboard', { replace: true })
    } catch {
      // error is set by useRegister hook
    }
  }

  const stepTitles = [
    'Crea tu cuenta',
    'Cuéntanos sobre tu negocio',
    'Tu operación comercial',
    'Proceso de ventas',
    'Preferencias de automatización',
    'Configuración inicial',
  ]
  const stepSubtitles = [
    'Acceso personal a la plataforma',
    'Datos básicos de tu empresa',
    'Cómo vendes y a quién',
    'Cómo gestionas tus ventas',
    'Activa la IA desde el primer día',
    'Personaliza SharkByte para tu negocio',
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding + progress */}
      <div className="hidden lg:flex lg:w-[380px] bg-sb-dark flex-col px-10 py-10 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
            <img src="/Logo.png" alt="SharkByte" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-tight block">SharkByte</span>
            <span className="text-[#6ab4f0] text-[10px] font-medium tracking-widest uppercase">CRM Platform</span>
          </div>
        </div>

        {/* Step list */}
        <div className="flex-1">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-6">Pasos de configuración</p>
          <div className="space-y-3">
            {STEPS.map((s) => {
              const done = s.id < step
              const active = s.id === step
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    active ? 'bg-sb-primary/20 border border-sb-primary/30' : 'border border-transparent'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    done ? 'bg-green-500' : active ? 'bg-sb-primary' : 'bg-white/10'
                  }`}>
                    {done ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className={`text-xs font-bold ${active ? 'text-white' : 'text-white/40'}`}>{s.id}</span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${active ? 'text-white' : done ? 'text-white/60' : 'text-white/30'}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-auto pt-8 border-t border-white/10">
          <p className="text-white/30 text-xs">
            Puedes ajustar toda esta configuración después desde el panel de tu negocio.
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="flex-1 flex items-start justify-center px-6 py-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <img src="/Logo.png" alt="SharkByte" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-sb-dark font-bold text-xl">SharkByte</span>
            </div>

            {/* Step header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-sb-primary uppercase tracking-widest">
                  Paso {step} de {TOTAL_STEPS}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{stepTitles[step - 1]}</h2>
              <p className="text-gray-500 text-sm mt-1">{stepSubtitles[step - 1]}</p>
            </div>

            {/* Progress bar */}
            <ProgressBar currentStep={step} total={TOTAL_STEPS} />

            {/* Step content */}
            <div className="min-h-[320px]">
              {step === 1 && <Step1 data={s1} setData={setS1} errors={errors} />}
              {step === 2 && <Step2 data={s2} setData={setS2} errors={errors} />}
              {step === 3 && <Step3 data={s3} setData={setS3} errors={errors} />}
              {step === 4 && <Step4 data={s4} setData={setS4} errors={errors} />}
              {step === 5 && <Step5 data={s5} setData={setS5} errors={errors} />}
              {step === 6 && <Step6 data={s6} setData={setS6} errors={errors} />}
            </div>

            {/* API error */}
            {error && step === TOTAL_STEPS && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
              )}
              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-sb-primary hover:bg-sb-secondary text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-sb-primary hover:bg-sb-secondary disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Creando cuenta...' : 'Activar mi negocio'}
                </button>
              )}
            </div>

            {/* Skip optional steps */}
            {step >= 3 && step < TOTAL_STEPS && (
              <button
                type="button"
                onClick={() => { setErrors({}); setStep((s) => s + 1) }}
                className="w-full mt-2 text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                Omitir este paso
              </button>
            )}

            {/* Login link */}
            {step === 1 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-sb-primary hover:text-sb-secondary font-medium transition-colors">
                  Inicia sesión
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
