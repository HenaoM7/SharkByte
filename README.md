# Econodo — Plataforma SaaS de Automatización Empresarial con IA

> Infraestructura multi-tenant de automatización inteligente vía WhatsApp con Evolution API, n8n y Claude AI.

---

## Vision del Producto

Econodo no es un bot de WhatsApp.

**Econodo es una plataforma SaaS donde cada cliente define su lógica de negocio sin tocar código.**

Cada tenant configura sus propias automatizaciones, prompts de IA, reglas de negocio y flujos de trabajo desde un panel administrativo. La infraestructura es compartida, el comportamiento es personalizado por cliente.

---

## Arquitectura en 8 Capas

```
┌─────────────────────────────────────────┐
│          CAPA 1 — FRONTEND              │
│          Panel Admin (React/Next.js)    │
│  Métricas · Configuración · Planes      │
└──────────────────┬──────────────────────┘
                   │ HTTPS + JWT
┌──────────────────▼──────────────────────┐
│          CAPA 2 — BACKEND API           │
│          (NestJS / Fastify)             │
│  Auth · Tenants · Planes · Billing      │
│  Rate Limit · Auditoría · Validación    │
└──────┬──────────────────────┬───────────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────────┐
│  CAPA 3     │    │      CAPA 4          │
│  MONGODB    │    │      REDIS           │
│  Multi-     │    │  Cache · Rate Limit  │
│  Tenant     │    │  Sesiones · Cola     │
└─────────────┘    └─────────────────────┘
       │
┌──────▼──────────────────────────────────┐
│          CAPA 5 — AUTH LAYER            │
│          JWT · Roles · Refresh Tokens   │
│  admin · owner · super_admin · viewer   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│          CAPA 6 — n8n                   │
│          Orquestador de Workflows       │
│  Consulta config · Ejecuta IA          │
│  Envía mensajes · Lógica dinámica       │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│          CAPA 7 — EVOLUTION API         │
│          Adaptador WhatsApp             │
│  Gestión de instancias · Webhooks       │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│          CAPA 8 — CLIENTES FINALES      │
│          Solo interactúan vía WhatsApp  │
│  Sin acceso a sistema interno           │
└─────────────────────────────────────────┘
```

---

## Stack Tecnológico

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | React 19 + Vite + Tailwind CSS | En desarrollo (`Econodo/`) |
| Backend API | NestJS + TypeScript + Mongoose | En desarrollo (`Backend/`) |
| Base de datos principal | MongoDB 6 | Activo |
| Cache / Rate Limit | Redis 7 | Activo (Evolution) |
| Autenticación | JWT | Pendiente |
| Orquestador | n8n (self-hosted) | Activo |
| WhatsApp | Evolution API v2.3.7 | Activo |
| Infraestructura | Docker Compose | Activo |
| Túnel local | ngrok | Desarrollo |

---

## Estructura del Proyecto

```
econodo/
├── README.md                    # Este archivo
├── ROADMAP.md                   # Hoja de ruta del producto
├── .gitignore
│
├── docs/                        # Documentación técnica
│   ├── architecture/            # Diagramas y decisiones de diseño
│   ├── setup/                   # Guías de instalación y despliegue
│   └── decisions/               # Architecture Decision Records (ADR)
│
├── infrastructure/              # Configuración de infraestructura
│   └── docker/
│       ├── docker-compose.yml   # Infraestructura base (desarrollo)
│       ├── docker-compose.prod.yml  # Overrides de producción
│       └── .env.example         # Plantilla de variables de entorno
│
├── Backend/                     # CAPA 2: API Backend (NestJS) — EN DESARROLLO
│   ├── src/
│   │   ├── app.module.ts        # Módulo raíz (MongoDB conectado)
│   │   └── modules/
│   │       ├── tenants/         # Schema de Tenant
│   │       ├── plans/           # Schema de Plan
│   │       └── usage/           # Servicio de registro de uso
│   └── dockerfile
│
├── Econodo/                     # CAPA 1: Panel Admin (React+Vite) — EN DESARROLLO
│   └── src/
│
├── apps/                        # Versión organizada (espejo de arriba)
│   ├── backend/src/             # Código del Backend copiado aquí
│   ├── frontend/                # README y planificación del Frontend
│   └── n8n-assistant/           # Tooling para desarrollo n8n con IA
│       ├── CLAUDE.md            # Instrucciones para Claude Code
│       ├── .mcp.json            # Configuración MCP server
│       └── n8n-skills/          # Skills de Claude para n8n (ext. repo)
│
├── n8n/                         # CAPA 6: Workflows n8n
│   ├── workflows/
│   │   ├── core/                # Workflows del sistema (routing, auth)
│   │   └── templates/           # Templates base por tenant
│   └── README.md
│
└── scripts/                     # Scripts de utilidad
    ├── start.sh                 # Levantar infraestructura
    ├── stop.sh                  # Detener infraestructura
    └── backup.sh                # Backup de datos
```

---

## Inicio Rápido (Desarrollo Local)

### 1. Prerequisitos
- Docker Desktop instalado y corriendo
- Node.js 18+
- ngrok (para webhooks locales)

### 2. Variables de entorno
```bash
cp infrastructure/docker/.env.example infrastructure/docker/.env
# Editar .env con tus credenciales
```

### 3. Levantar infraestructura
```bash
bash scripts/start.sh
# O directamente:
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### 4. Verificar servicios
| Servicio | URL | Credenciales |
|---------|-----|-------------|
| n8n | http://localhost:5678 | admin / (ver .env) |
| MongoDB UI | http://localhost:8081 | admin / (ver .env) |
| Evolution API | http://localhost:8080 | API Key en .env |

Ver [docs/setup/LOCAL_DEV.md](docs/setup/LOCAL_DEV.md) para guía completa.

---

## Principios de Diseño

1. **Separación de responsabilidades** — Cada capa hace una sola cosa
2. **Desacoplamiento** — Si n8n falla, el backend sigue vivo
3. **Multi-tenant real** — El backend identifica al tenant, n8n solo ejecuta
4. **Escalabilidad progresiva** — Monolito → Servicios separados → Microservicios
5. **Seguridad por diseño** — MongoDB no expuesto, JWT obligatorio, Redis como guardián

---

## Links Útiles

- [Roadmap](ROADMAP.md)
- [Guía de arquitectura](docs/architecture/OVERVIEW.md)
- [Diseño multi-tenant](docs/architecture/MULTI_TENANT.md)
- [Guía de desarrollo local](docs/setup/LOCAL_DEV.md)
- [Guía de producción](docs/setup/PRODUCTION.md)
- [n8n Assistant](apps/n8n-assistant/CLAUDE.md)
