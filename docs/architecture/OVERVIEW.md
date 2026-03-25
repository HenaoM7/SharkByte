# Arquitectura del Sistema — Econodo SaaS

## Resumen

Econodo es una plataforma SaaS multi-tenant de automatización empresarial.
El canal de comunicación es WhatsApp (vía Evolution API).
El cerebro de automatización es n8n.
La inteligencia artificial es Claude/GPT integrada en n8n.
El gobierno del sistema es el Backend API.

---

## Flujo de una Solicitud de Cliente Final

```
Cliente WhatsApp
     │
     ▼ Mensaje
Evolution API (puerto 8080)
     │
     ▼ Webhook POST
n8n — Webhook Receiver
     │
     ▼ HTTP Request
Backend API — GET /tenant/{phone}/config
     │
     ▼ Respuesta config
n8n — Routing Logic
     │
     ├── Si automación habilitada → Ejecutar workflow del tenant
     │        │
     │        ▼
     │   n8n — AI Agent (Claude/GPT)
     │        │
     │        ▼
     │   n8n — Construir respuesta
     │
     └── Si fuera de horario / límite excedido → Respuesta default
          │
          ▼
     n8n — Evolution API — Enviar mensaje
          │
          ▼
     Cliente recibe respuesta
```

---

## Responsabilidades por Capa

### CAPA 1 — Frontend (Panel Admin)

**Tecnología objetivo:** Next.js 14 + React + Tailwind

**Propósito:** Interfaz para que los dueños de negocio gestionen su instancia.

**Lo que hace:**
- Dashboard con métricas (mensajes, conversiones, uso de IA)
- Gestión de configuración del tenant (horarios, prompts, reglas)
- Gestión de plan y facturación
- Historial de conversaciones
- Activar/desactivar automatizaciones

**Lo que NO hace:**
- No accede directamente a MongoDB
- No llama a la Evolution API directamente
- No modifica workflows de n8n
- No maneja autenticación de clientes finales (WhatsApp)

**Comunica con:** Backend API exclusivamente (HTTPS + JWT)

---

### CAPA 2 — Backend API (Cerebro Administrativo)

**Tecnología objetivo:** NestJS + TypeScript + Mongoose

**Propósito:** Gobierno completo del sistema. Es la única capa que toca MongoDB directamente.

**Módulos:**
```
src/
├── auth/           # JWT, refresh tokens, sesiones admin
├── tenants/        # CRUD de tenants, configuración
├── plans/          # Gestión de planes (Free/Pro/Enterprise)
├── billing/        # Registro de uso, límites, facturación
├── webhooks/       # Recibir eventos de Evolution API
├── users/          # Usuarios del panel admin
└── health/         # Health checks
```

**Lo que hace:**
- Autenticación JWT para el panel admin
- Validar que un tenant tiene plan activo
- Consultar y actualizar configuración de tenant
- Registrar consumo (mensajes, tokens IA, etc.)
- Controlar límites por plan
- Auditoría de operaciones

**Lo que NO hace:**
- No procesa conversaciones de WhatsApp (eso es n8n)
- No ejecuta IA directamente
- No gestiona instancias de Evolution API

**Expone hacia:**
- Frontend: API REST (`/api/v1/*`)
- n8n: Endpoint de configuración de tenant (`/internal/tenant/*`)

---

### CAPA 3 — MongoDB (Fuente de Verdad)

**Versión:** MongoDB 6

**Propósito:** Almacenamiento principal del sistema.

**Colecciones principales:**
```
tenants            # Configuración de cada cliente
├── _id
├── phone          # Número WhatsApp del negocio
├── name           # Nombre del negocio
├── plan           # free | pro | enterprise
├── config         # Configuración personalizable (JSON flexible)
│   ├── aiPrompt   # Prompt del asistente IA
│   ├── schedule   # Horarios de atención
│   ├── rules      # Reglas de negocio
│   └── greeting   # Mensaje de bienvenida
├── evolutionInstance  # Instancia de Evolution API
├── isActive       # Estado del servicio
└── createdAt

usage              # Registro de consumo por tenant
├── tenantId
├── date
├── messagesCount
├── aiTokensUsed
└── workflowExecutions

plans              # Definición de planes
├── name
├── limits
└── price

users              # Usuarios del panel admin
├── email
├── tenantId
├── role           # admin | owner | viewer
└── passwordHash
```

**Patrón multi-tenant:** Separación por campo `tenantId` en todas las colecciones.

---

### CAPA 4 — Redis (Velocidad y Control)

**Versión:** Redis 7

**Propósito:** Cache, rate limiting y control de concurrencia.

**Usos:**
```
rate_limit:{tenantId}:{window}   # Contador de mensajes por ventana
session:{userId}                  # Sesiones de panel admin
config_cache:{tenantId}           # Cache de configuración (TTL 5min)
conversation:{phone}              # Estado de conversación activa
```

**Estado actual:** Redis está activo pero solo para Evolution API internamente.
**Próximo paso:** Integrar con Backend API para rate limiting real.

---

### CAPA 5 — Auth Layer (JWT)

**Propósito:** Proteger todos los endpoints del sistema.

**Roles:**
| Rol | Acceso |
|-----|--------|
| `super_admin` | Todo el sistema, todos los tenants |
| `admin` | Su tenant completo |
| `owner` | Su tenant, sin facturación |
| `viewer` | Solo lectura |

**Tokens:**
- Access Token: TTL 15 minutos
- Refresh Token: TTL 7 días, rotación automática

---

### CAPA 6 — n8n (Orquestador)

**Versión:** n8n latest (self-hosted en Docker)
**Puerto:** 5678
**Backend DB:** MongoDB (colección `eco_nodo`)

**Propósito:** Ejecutar automatizaciones. No gobierna, ejecuta.

**Workflows principales:**
```
[Core] Router de mensajes entrantes
  └── Recibe webhook de Evolution API
  └── Llama a Backend para obtener config del tenant
  └── Decide qué workflow de tenant ejecutar
  └── Registra la ejecución

[Core] Handler de IA
  └── Recibe mensaje + configuración del tenant
  └── Construye prompt con contexto
  └── Llama a Claude/GPT con el prompt del tenant
  └── Procesa respuesta
  └── Envía por Evolution API

[Core] Out-of-hours Handler
  └── Detecta horario fuera de atención
  └── Envía mensaje configurado por el tenant
```

**Patrón de configuración dinámica:**
n8n nunca tiene configuración hardcodeada de tenants.
Siempre consulta al Backend API para obtener la config actual.
Esto permite cambios en tiempo real sin reiniciar workflows.

---

### CAPA 7 — Evolution API (Adaptador WhatsApp)

**Versión:** v2.3.7
**Puerto:** 8080
**Backend:** PostgreSQL + Redis

**Propósito:** Puente entre WhatsApp y el sistema. Nada más.

**Lo que hace:**
- Gestiona instancias de WhatsApp (una por tenant)
- Recibe mensajes y envía webhooks a n8n
- Envía mensajes salientes
- Gestiona medios (imágenes, audio, documentos)

**Aislamiento:**
Si mañana se cambia a Twilio o Meta Cloud API,
solo se cambia la Capa 7.
El resto del sistema no se toca.

---

### CAPA 8 — Clientes Finales

Los usuarios finales solo interactúan vía WhatsApp.
No tienen acceso a ningún sistema interno.
Esto elimina toda la superficie de ataque del lado del cliente.

---

## Principios Aplicados

| Principio | Implementación |
|-----------|----------------|
| Single Responsibility | Cada capa hace una cosa |
| Open/Closed | Añadir tenant no modifica código base |
| Separation of Concerns | n8n ejecuta, Backend gobierna |
| Defense in Depth | JWT + Redis + MongoDB sin exponer |
| Tenant Isolation | tenantId en cada documento |
