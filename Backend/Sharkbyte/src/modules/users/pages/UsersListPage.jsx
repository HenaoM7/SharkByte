import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser, useActivateUser } from '../hooks'
import Badge from '../../../shared/ui/Badge'
import Button from '../../../shared/ui/Button'
import Modal from '../../../shared/ui/Modal'
import Pagination from '../../../shared/ui/Pagination'
import TableSkeleton from '../../../shared/ui/TableSkeleton'
import ConfirmModal from '../../../shared/ui/ConfirmModal'
import { useToast } from '../../../shared/hooks/useToast'
import { parseApiError } from '../../../shared/api/client'
import { useDebounce } from '../../../shared/hooks/useDebounce'

const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', owner: 'Owner', viewer: 'Viewer' }
const ROLE_VARIANTS = { super_admin: 'plan-enterprise', admin: 'plan-pro', owner: 'plan-free', viewer: 'inactive' }

const ROLE_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'viewer', label: 'Viewer' },
]

const createSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.enum(['viewer', 'owner', 'admin', 'super_admin']),
  tenantId: z.string().optional(),
})

const editSchema = z.object({
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  role: z.enum(['viewer', 'owner', 'admin', 'super_admin']).optional(),
  tenantId: z.string().optional(),
})

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-red-600 mt-1">{message}</p>
}

function inputCls(err) {
  return `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
    err ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-sb-primary'
  }`
}

function CreateUserModal({ isOpen, onClose }) {
  const createUser = useCreateUser()
  const toast = useToast()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { email: '', password: '', role: 'viewer', tenantId: '' },
  })

  const onSubmit = (data) => {
    const payload = { ...data, tenantId: data.tenantId || undefined }
    createUser.mutate(payload, {
      onSuccess: () => { toast.success('Usuario creado correctamente'); reset(); onClose() },
      onError: (err) => toast.error(parseApiError(err).message),
    })
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Crear Usuario">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email *</label>
          <input {...register('email')} type="email" placeholder="usuario@empresa.com" className={inputCls(errors.email)} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Contraseña * (mín. 8 caracteres)</label>
          <input {...register('password')} type="password" placeholder="••••••••" className={inputCls(errors.password)} />
          <FieldError message={errors.password?.message} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rol</label>
          <select {...register('role')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sb-primary">
            <option value="viewer">Viewer — solo lectura</option>
            <option value="owner">Owner — gestiona su tenant</option>
            <option value="admin">Admin — acceso amplio</option>
            <option value="super_admin">Super Admin — acceso total</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tenant ID (opcional)</label>
          <input {...register('tenantId')} type="text" placeholder="ten_xxxxx" className={inputCls(errors.tenantId)} />
          <FieldError message={errors.tenantId?.message} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1 justify-center">Cancelar</Button>
          <Button type="submit" loading={createUser.isPending} className="flex-1 justify-center">Crear usuario</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditUserModal({ user, onClose }) {
  const updateUser = useUpdateUser()
  const toast = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: { email: user.email, role: user.role, tenantId: user.tenantId ?? '' },
  })

  const onSubmit = (data) => {
    const payload = { ...data, tenantId: data.tenantId || undefined }
    updateUser.mutate({ id: user._id, ...payload }, {
      onSuccess: () => { toast.success('Usuario actualizado'); onClose() },
      onError: (err) => toast.error(parseApiError(err).message),
    })
  }

  return (
    <Modal open={!!user} onClose={onClose} title="Editar Usuario">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input {...register('email')} type="email" className={inputCls(errors.email)} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rol</label>
          <select {...register('role')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sb-primary">
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tenant ID (opcional)</label>
          <input {...register('tenantId')} type="text" placeholder="ten_xxxxx" className={inputCls(errors.tenantId)} />
          <FieldError message={errors.tenantId?.message} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1 justify-center">Cancelar</Button>
          <Button type="submit" loading={updateUser.isPending} className="flex-1 justify-center">Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function UsersListPage() {
  const toast = useToast()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)

  const debouncedSearch = useDebounce(search, 400)

  const queryParams = {
    page,
    limit: 20,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(roleFilter && { role: roleFilter }),
  }

  const { data, isLoading } = useUsers(queryParams)
  const deactivate = useDeactivateUser()
  const activate = useActivateUser()

  const users = data?.data ?? []
  const pagination = { page: data?.page ?? 1, pages: data?.pages ?? 1, total: data?.total ?? 0, limit: 20 }

  const handleSearchChange = useCallback((e) => { setSearch(e.target.value); setPage(1) }, [])
  const handleRoleChange = useCallback((e) => { setRoleFilter(e.target.value); setPage(1) }, [])

  const handleDeactivate = () => {
    if (!confirmDeactivate) return
    deactivate.mutate(confirmDeactivate._id, {
      onSuccess: () => { toast.success('Usuario desactivado'); setConfirmDeactivate(null) },
      onError: (err) => { toast.error(parseApiError(err).message); setConfirmDeactivate(null) },
    })
  }

  const handleActivate = (id) => {
    activate.mutate(id, {
      onSuccess: () => toast.success('Usuario activado'),
      onError: (err) => toast.error(parseApiError(err).message),
    })
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por email..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={handleRoleChange}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sb-primary"
        >
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)} className="shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </Button>
      </div>

      {!isLoading && (
        <p className="text-xs text-gray-500">
          {pagination.total} usuario{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {[
                { label: 'Email' },
                { label: 'Rol' },
                { label: 'Tenant ID', cls: 'hidden sm:table-cell' },
                { label: 'Estado' },
                { label: 'Acciones' },
              ].map((h) => (
                <th key={h.label} className={`text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider ${h.cls ?? ''}`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <p className="text-gray-400 text-sm">Sin resultados</p>
                  {(search || roleFilter) && (
                    <button
                      onClick={() => { setSearch(''); setRoleFilter(''); setPage(1) }}
                      className="text-xs text-sb-primary hover:text-sb-secondary mt-1"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-gray-800 max-w-[180px] truncate">{u.email}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <Badge variant={ROLE_VARIANTS[u.role] ?? 'inactive'}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500 font-mono text-xs hidden sm:table-cell">
                    {u.tenantId ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <Badge variant={u.isActive ? 'active' : 'inactive'}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditUser(u)}
                        className="text-xs text-sb-primary hover:text-sb-secondary transition-colors"
                      >
                        Editar
                      </button>
                      {u.isActive ? (
                        <button
                          onClick={() => setConfirmDeactivate(u)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(u._id)}
                          disabled={activate.isPending}
                          className="text-xs text-sb-primary hover:text-sb-secondary transition-colors disabled:opacity-50"
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} onPageChange={setPage} />

      <CreateUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} />

      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} />
      )}

      <ConfirmModal
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Desactivar usuario"
        message={`¿Estás seguro de que quieres desactivar a ${confirmDeactivate?.email}? El usuario perderá acceso inmediatamente.`}
        confirmLabel="Desactivar"
        variant="danger"
        loading={deactivate.isPending}
      />
    </div>
  )
}
