import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '../../../shared/ui/Button'

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().min(7, 'Ingresa un número válido').regex(/^\+/, 'El teléfono debe comenzar con +'),
  email: z.string().email('Email inválido'),
})

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-red-600 mt-1">{message}</p>
}

function inputClass(hasError) {
  return `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-300 focus:ring-red-400 bg-red-50'
      : 'border-gray-200 focus:ring-sb-primary'
  }`
}

export default function TenantForm({ onSubmit, onCancel, loading, error }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          {...register('name')}
          placeholder="Mi Empresa SAS"
          className={inputClass(!!errors.name)}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
        <input
          {...register('phone')}
          placeholder="+57300..."
          className={inputClass(!!errors.phone)}
        />
        <FieldError message={errors.phone?.message} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          {...register('email')}
          placeholder="contacto@empresa.com"
          className={inputClass(!!errors.email)}
        />
        <FieldError message={errors.email?.message} />
      </div>

      {/* DEV MODE: aviso de pago comentado — restaurar en producción
      <div className="bg-sb-primary/5 border border-sb-primary/15 rounded-lg px-3 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-sb-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-sb-neutral">Plan asignado: <span className="font-semibold text-sb-dark">Enterprise</span> — se activa tras confirmar el pago.</p>
      </div>
      */}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Crear Tenant
        </Button>
      </div>
    </form>
  )
}
