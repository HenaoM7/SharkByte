# Roadmap — Econodo SaaS

> Estado actual y hoja de ruta hacia plataforma SaaS completa.

---

## Estado Actual (Fase 0+1 — En Desarrollo Activo)

### Infraestructura Base — COMPLETADO
- [x] Docker Compose con servicios base
- [x] n8n self-hosted con MongoDB
- [x] Evolution API v2.3.7 con PostgreSQL + Redis
- [x] Tunnel ngrok para desarrollo local
- [x] n8n-assistant con 7 skills de IA para desarrollo
- [x] Documentación de arquitectura
- [x] Estructura profesional del proyecto

### Backend API (NestJS) — EN DESARROLLO (`Backend/`)
- [x] Proyecto NestJS inicializado
- [x] Conexión MongoDB con Mongoose (ConfigModule + MongooseModule)
- [x] Schema de Tenant (`name`, `plan`, `status`, `messagesUsed`, `tokensUsed`)
- [x] Schema de Plan (`name`, `maxMessages`, `maxTokens`, `price`)
- [x] Servicio de uso (`registerUsage`: suma mensajes + tokens por tenant)
- [ ] Módulo Auth (JWT access + refresh tokens)
- [ ] Módulo de tenants (CRUD completo)
- [ ] Endpoint interno para n8n: `GET /internal/tenant/by-instance/:name`
- [ ] Control de límites por plan

### Frontend (React + Vite) — EN DESARROLLO (`Econodo/`)
- [x] Proyecto React 19 + Vite + Tailwind CSS inicializado
- [x] Repositorio Git propio
- [ ] Layout con sidebar y header
- [ ] Página de login con JWT
- [ ] Dashboard con métricas
- [ ] Página de configuración del negocio/IA

### Workflows n8n — ESPECIFICADOS, pendientes de activar
- [x] SAAS-CORE-spec.md: Especificación completa del flujo de onboarding
- [x] SAAS-CORE-workflow.json: Workflow de onboarding (router + IA + MongoDB)
- [x] Backups: Router (2 versiones), Onboarding (1 versión)
- [ ] Activar SAAS-CORE workflow en producción
- [ ] Workflow: Handler de IA configurado por tenant
- [ ] Workflow: Respuesta fuera de horario

---

## FASE 2 — Integración Backend ↔ n8n (Próximo)

**Objetivo:** n8n consulta al Backend para obtener config del tenant. El Backend gobierna.

### Milestone 2.1: Completar Backend API
- [ ] Módulo Auth (JWT) completo con guards
- [ ] CRUD de tenants con validación de plan
- [ ] Endpoint interno para n8n (sin JWT, con x-internal-key)
- [ ] Registro de uso desde n8n → Backend

### Milestone 2.2: Migrar Workflows a Arquitectura de Capas
- [ ] n8n llama a Backend en lugar de leer MongoDB directamente
- [ ] Validación de límites de plan en el flujo
- [ ] Router identifica al tenant via Backend
- [ ] Flujo completo end-to-end con un número real

---

## FASE 2 — Backend API

**Objetivo:** El sistema es gobernado por una API real, no por configuración manual.

### Milestone 2.1: Backend Base
- [ ] Crear proyecto NestJS en `apps/backend/`
- [ ] Módulo de health check
- [ ] Conexión a MongoDB con Mongoose
- [ ] Variables de entorno con validación

### Milestone 2.2: Autenticación
- [ ] Módulo de usuarios (super_admin, admin, owner)
- [ ] JWT con access + refresh tokens
- [ ] Guards de roles
- [ ] Endpoints: POST /auth/login, POST /auth/refresh

### Milestone 2.3: Gestión de Tenants
- [ ] CRUD de tenants
- [ ] Schema de configuración de tenant
- [ ] Endpoint interno para n8n: GET /internal/tenant/by-instance/:name
- [ ] n8n migra de leer MongoDB directamente a llamar al Backend

### Milestone 2.4: Control de Uso
- [ ] Registro de mensajes por tenant
- [ ] Registro de tokens IA consumidos
- [ ] Validación de límites por plan
- [ ] Endpoint: POST /internal/usage/record

---

## FASE 3 — Panel Admin (Frontend)

**Objetivo:** Los tenants pueden configurarse sin ayuda técnica.

### Milestone 3.1: Scaffold Frontend
- [ ] Crear proyecto Next.js en `apps/frontend/`
- [ ] Configurar Tailwind + shadcn/ui
- [ ] Layout base con sidebar

### Milestone 3.2: Autenticación en Frontend
- [ ] Página de login
- [ ] Manejo de JWT en cliente
- [ ] Rutas protegidas
- [ ] Página de registro de nuevo tenant

### Milestone 3.3: Dashboard y Configuración
- [ ] Dashboard con métricas básicas
- [ ] Página de configuración del asistente IA
- [ ] Configuración de horarios
- [ ] Vista de conversaciones recientes

### Milestone 3.4: Conexión WhatsApp Guiada
- [ ] Flujo de onboarding para conectar WhatsApp
- [ ] Mostrar QR code desde Evolution API
- [ ] Estado de conexión en tiempo real

---

## FASE 4 — Monetización y Producción

**Objetivo:** El sistema puede generar ingresos reales.

### Milestone 4.1: Planes y Billing
- [ ] Definir planes: Free, Pro, Enterprise
- [ ] Integrar pasarela de pago (Stripe o local)
- [ ] Automatizar corte por no pago
- [ ] Notificaciones de límites

### Milestone 4.2: Despliegue en Producción
- [ ] VPS con dominio propio
- [ ] Nginx + SSL automático
- [ ] Backup automático diario
- [ ] Monitoreo con alertas

### Milestone 4.3: Multi-instancia WhatsApp
- [ ] Cada tenant puede tener múltiples números
- [ ] Gestión de instancias desde el panel

---

## FASE 5 — Escala

**Objetivo:** El sistema soporta cientos de tenants activos simultáneamente.

- [ ] n8n en modo queue con múltiples workers
- [ ] Redis para rate limiting en Backend
- [ ] MongoDB con índices optimizados
- [ ] CDN para el frontend
- [ ] Separar Backend API en servidor dedicado
- [ ] Análisis de costos por tenant

---

## Métricas de Éxito por Fase

| Fase | Métrica clave |
|------|--------------|
| 0 | Infraestructura corriendo sin errores |
| 1 | 1 tenant atendiendo mensajes reales 24/7 |
| 2 | API gobierna 5 tenants sin intervención manual |
| 3 | Un dueño de negocio puede onboardearse sin ayuda técnica |
| 4 | Primer pago procesado automáticamente |
| 5 | 100 tenants activos simultáneos sin degradación |
