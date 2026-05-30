# SharkByte — SaaS de Automatización Empresarial con IA vía WhatsApp

> Plataforma multi-tenant que permite a pequeñas y medianas empresas automatizar su atención al cliente y ventas vía WhatsApp usando agentes de inteligencia artificial configurables sin código.

**Integrantes:** Miguel Ángel Henao Cañas · Luis Fernando Rojas Correa  
**Institución:** Institución Universitaria Salazar y Herrera  
**Repositorio:** https://github.com/HenaoM7/SharkByte

---

## URLs del Proyecto

| Ambiente | Servicio | URL |
|---|---|---|
| **Producción** | Aplicación web | https://sharkbyteia.com |
| **Producción** | API Backend | https://api.sharkbyteia.com |
| **Producción** | n8n Workflows | https://n8n.sharkbyteia.com |
| **Desarrollo** | Aplicación web | https://sharkbyte-dev.vercel.app |
| **Desarrollo** | API Backend | https://sharkbyte-api-dev.onrender.com |
| **Desarrollo** | n8n Workflows | https://sharkbyte-n8n-dev.onrender.com |
| **Desarrollo** | Evolution API | https://sharkbyte-evolution-dev.onrender.com |

---

## Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────┐
│              CLIENTE (WhatsApp)                          │
└───────────────────────┬──────────────────────────────────┘
                        │ mensaje
           ┌────────────▼────────────┐
           │    EVOLUTION API v2.3.7 │  ← Capa WhatsApp (Baileys)
           │    (Docker / Render)    │
           └────────────┬────────────┘
                        │ webhook POST
           ┌────────────▼────────────┐
           │    n8n v2.22.5          │  ← Orquestador de workflows
           │    (Docker / Render)    │
           └────┬───────────────┬────┘
                │               │
   ┌────────────▼────┐   ┌──────▼──────────────┐
   │  OPENAI GPT-4o  │   │  BACKEND NestJS      │  ← API REST
   │  (IA / LLM)     │   │  (PM2 / Render)      │
   └─────────────────┘   └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  MONGODB ATLAS M0    │  ← Base de datos
                         │  (NoSQL / Cloud)     │
                         └──────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              DUEÑO DEL NEGOCIO (Browser)                 │
│              React 19 + Vite (Vercel)                    │
└──────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + Vite + TailwindCSS + React Query | 19 / 7.x |
| Backend | NestJS + TypeScript + Mongoose | 10.x / 5.x |
| Base de datos principal | MongoDB Atlas M0 | 7.x |
| Automatización | n8n (self-hosted / Render) | 2.22.5 |
| WhatsApp | Evolution API (Baileys) | 2.3.7 |
| IA | OpenAI GPT-4o | API v1 |
| Infraestructura local | Docker Compose | 3.x |
| Proceso backend | PM2 (producción) | 5.x |
| Proxy inverso | Nginx (producción) | — |
| Almacenamiento objetos | MinIO (dev) / DigitalOcean Spaces (prod) | — |

---

## Prerrequisitos

Antes de instalar, asegúrese de tener:

- **Node.js** v20.x o superior → https://nodejs.org
- **npm** v10.x o superior (incluido con Node.js)
- **Docker Desktop** instalado y corriendo → https://www.docker.com/products/docker-desktop
- **Git** → https://git-scm.com
- **PM2** (gestor de procesos): `npm install -g pm2`

Verificar instalación:
```bash
node --version    # v20.x.x
npm --version     # 10.x.x
docker --version  # Docker version 24.x.x
git --version     # git version 2.x.x
```

---

## Instalación Local — Paso a Paso

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/HenaoM7/SharkByte.git
cd SharkByte
```

### Paso 2 — Levantar servicios de infraestructura (Docker)

Los servicios auxiliares (n8n, Evolution API, MinIO, MongoDB local, PostgreSQL) se levantan con Docker Compose:

```bash
cd infrastructure/docker
docker compose up -d
```

Verificar que todos los contenedores estén corriendo:
```bash
docker ps
```

Servicios esperados:
| Contenedor | Puerto | Descripción |
|---|---|---|
| eco_n8n | 5678 | Automatización de workflows |
| eco_n8n_postgres | — | BD interna de n8n |
| eco_evolution | 8080 | WhatsApp API |
| eco_evolution_postgres | — | BD interna de Evolution |
| eco_evolution_redis | — | Cache de Evolution |
| eco_minio | 9000/9001 | Almacenamiento de imágenes |
| eco_mongodb | 27018 | MongoDB local (alternativa a Atlas) |

### Paso 3 — Configurar el Backend

```bash
cd ../../Backend
cp .env.example .env
```

Editar `.env` con los valores correspondientes (ver sección Variables de Entorno).

Instalar dependencias y compilar:
```bash
npm install
npm run build
```

### Paso 4 — Ejecutar el Backend

**Modo desarrollo (hot-reload):**
```bash
npm run start:dev
```

**Modo producción con PM2:**
```bash
cd ..
pm2 start ecosystem.config.js
pm2 save
```

Verificar que el backend está corriendo:
```bash
curl http://localhost:3000/health
# Respuesta esperada: {"status":"ok","timestamp":"..."}
```

### Paso 5 — Configurar el Frontend

```bash
cd Sharkbyte
npm install
```

Crear archivo de variables de entorno para desarrollo:
```bash
# Crear archivo .env.development con:
echo "VITE_API_URL=http://localhost:3000" > .env.development
echo "VITE_N8N_URL=http://localhost:5678" >> .env.development
```

### Paso 6 — Ejecutar el Frontend

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:5173

### Paso 7 — Verificar todos los servicios

| Servicio | URL local | Credenciales por defecto |
|---|---|---|
| Aplicación web | http://localhost:5173 | admin@sharkbyte.com / Admin1234! |
| API Backend | http://localhost:3000/health | — |
| Swagger Docs | http://localhost:3000/api-docs | — |
| n8n | http://localhost:5678 | Setup wizard al primer acceso |
| Evolution API | http://localhost:8080 | Header: `apikey: superapikey` |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin123 |
| Mongo Express | http://localhost:8081 | admin / admin123 |

---

## Variables de Entorno

### Backend — `Backend/.env`

```env
# ── Servidor ──────────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── Base de datos ─────────────────────────────────────────────────────────────
# Opción A: MongoDB local Docker
MONGO_URI=mongodb://admin:admin123@localhost:27018/eco_nodo?authSource=admin

# Opción B: MongoDB Atlas M0 (requiere IP en whitelist de Atlas)
# MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/eco_nodo?retryWrites=true&w=majority

# ── Autenticación JWT ─────────────────────────────────────────────────────────
JWT_SECRET=econodo_jwt_secret_dev_minimo_32_chars_seguro
JWT_REFRESH_SECRET=econodo_refresh_secret_dev_diferente_al_jwt
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── API Keys internas ─────────────────────────────────────────────────────────
INTERNAL_API_KEY=econodo_internal_key_dev_n8n_2024

# ── Evolution API (WhatsApp) ──────────────────────────────────────────────────
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=superapikey
EVOLUTION_API_URL_INTERNAL=http://eco_evolution:8080

# ── n8n Webhooks ──────────────────────────────────────────────────────────────
N8N_WEBHOOK_URL=http://eco_n8n:5678/webhook/whatsapp-inbound

# ── Almacenamiento (MinIO local) ──────────────────────────────────────────────
DO_SPACES_KEY=minioadmin
DO_SPACES_SECRET=minioadmin123
DO_SPACES_ENDPOINT=http://localhost:9000
DO_SPACES_BUCKET=sharkbyte-dev
DO_SPACES_CDN_URL=http://localhost:9000/sharkbyte-dev
DO_SPACES_FORCE_PATH_STYLE=true

# ── Email (Ethereal — buzón de pruebas gratuito) ──────────────────────────────
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_usuario@ethereal.email
SMTP_PASS=tu_password_ethereal
SMTP_FROM=noreply@sharkbyte.dev

# ── Pagos (MercadoPago Sandbox) ───────────────────────────────────────────────
MERCADOPAGO_ACCESS_TOKEN=TEST-reemplazar-con-token-sandbox

# ── CORS ──────────────────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173

# ── Google OAuth (opcional) ───────────────────────────────────────────────────
GOOGLE_CLIENT_ID=reemplazar
GOOGLE_CLIENT_SECRET=reemplazar
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
GOOGLE_ENCRYPTION_KEY=sharkbyte-google-encrypt-key-32ch
```

### Frontend — `Sharkbyte/.env.development`

```env
VITE_API_URL=http://localhost:3000
VITE_N8N_URL=http://localhost:5678
```

### Docker — `infrastructure/docker/.env`

```env
N8N_USER=admin
N8N_PASSWORD=admin123
WEBHOOK_URL=http://localhost:5678/
BACKEND_INTERNAL_KEY=econodo_internal_key_dev_n8n_2024
EVOLUTION_API_KEY=superapikey
N8N_DB_USER=n8n
N8N_DB_PASSWORD=n8n_pass
```

---

## Comandos de Ejecución

### Backend

```bash
# Desarrollo (hot-reload)
cd Backend && npm run start:dev

# Producción (PM2)
cd Backend && npm run build
pm2 start ecosystem.config.js

# Ver estado PM2
pm2 status

# Ver logs en tiempo real
pm2 logs sharkbyte-api

# Reiniciar
pm2 restart sharkbyte-api

# Detener
pm2 stop sharkbyte-api
```

### Frontend

```bash
# Desarrollo
cd Sharkbyte && npm run dev

# Build de producción
cd Sharkbyte && npm run build

# Preview del build
cd Sharkbyte && npm run preview
```

### Docker

```bash
# Levantar todos los servicios
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Ver logs de un servicio
docker logs eco_n8n -f

# Detener todos
docker compose -f infrastructure/docker/docker-compose.yml down

# Detener y eliminar volúmenes (CUIDADO: borra datos)
docker compose -f infrastructure/docker/docker-compose.yml down -v
```

### Tests

```bash
# Ejecutar todos los tests unitarios
cd Backend && npm test

# Tests con coverage
cd Backend && npm run test:cov

# Tests en modo watch
cd Backend && npm run test:watch
```

---

## Estructura del Proyecto

```
SharkByte/
├── Backend/                    # API REST — NestJS + TypeScript
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── common/             # Guards, filters, interceptors, dto
│   │   └── modules/            # 22 módulos de negocio
│   │       ├── auth/           # JWT, cookies, registro, login
│   │       ├── tenants/        # Multi-tenant core
│   │       ├── users/          # Gestión de usuarios
│   │       ├── products/       # Catálogo de productos
│   │       ├── conversations/  # CRM — conversaciones WhatsApp
│   │       ├── pipeline/       # CRM — pipeline de ventas
│   │       ├── whatsapp/       # Integración Evolution API
│   │       ├── billing/        # Facturación MercadoPago
│   │       ├── internal/       # Endpoints protegidos para n8n
│   │       └── ...
│   ├── ecosystem.config.js     # Configuración PM2
│   └── .env.example
│
├── Sharkbyte/                  # Frontend — React 19 + Vite
│   ├── src/
│   │   ├── app/                # Router, providers
│   │   ├── modules/            # Módulos por dominio
│   │   │   ├── auth/           # Login, registro
│   │   │   ├── tenants/        # Gestión de negocios
│   │   │   ├── conversations/  # Chat CRM
│   │   │   ├── products/       # Catálogo
│   │   │   ├── integrations/   # WhatsApp, Google
│   │   │   └── ...
│   │   └── shared/             # Componentes, API client, utils
│   └── vercel.json             # Configuración Vercel + proxy
│
├── infrastructure/
│   └── docker/
│       ├── docker-compose.yml  # n8n, Evolution API, MinIO, MongoDB
│       ├── n8n.Dockerfile
│       └── evolution.Dockerfile
│
├── n8n/
│   └── workflows/
│       ├── core/               # Workflows limpios para importar
│       └── prod_export/        # Export de producción
│
├── render.yaml                 # Blueprint Render (dev cloud)
├── ecosystem.config.js         # PM2 raíz (dev local)
└── README.md
```

---

## Módulos del Backend

El backend tiene **22 módulos** con arquitectura controlador → servicio → esquema (Mongoose):

| Módulo | Descripción |
|---|---|
| `auth` | Registro, login, JWT, cookies, refresh tokens, reset password |
| `tenants` | Core multi-tenant, planes, activación, soft-delete |
| `tenant-config` | Configuración del agente IA por negocio |
| `users` | Gestión de usuarios por tenant |
| `products` | Catálogo de productos con imágenes |
| `conversations` | CRM — historial de conversaciones WhatsApp |
| `contacts` | Gestión de contactos del negocio |
| `pipeline` | CRM — pipeline de ventas con deals por etapas |
| `sales` | Registro y estadísticas de ventas |
| `whatsapp` | Integración Evolution API, QR, estado de conexión |
| `billing` | Suscripciones y pagos vía MercadoPago |
| `plans` | Definición de planes (free, starter, enterprise) |
| `usage` | Control de uso (mensajes, tokens) por tenant |
| `appointments` | Agendamiento de citas |
| `analytics` | Métricas para super_admin |
| `automation` | Reglas de automatización configurables |
| `channels` | Canales adicionales (Telegram, Instagram, etc.) |
| `tags` | Etiquetado de conversaciones |
| `internal` | Endpoints protegidos exclusivos para n8n |
| `google-integration` | Google Calendar y Sheets |
| `catalog-pdf` | Generación de PDF del catálogo |
| `references` | Gestión de referencias de productos |

---

## Seguridad

- **Autenticación**: JWT en cookies `httpOnly; Secure; SameSite=None` (cross-origin) o `SameSite=Strict` (mismo dominio)
- **Hashing**: bcrypt con 12 rondas de sal
- **Rate limiting**: 100 req/min general, 10 req/min en endpoints sensibles (ThrottlerModule)
- **RBAC**: Roles `super_admin`, `admin`, `owner`, `viewer` con guards por ruta
- **Aislamiento multi-tenant**: `OwnershipGuard` verifica que el JWT pertenece al tenant solicitado
- **Headers HTTP**: Helmet.js (CSP, HSTS, XSS protection, etc.)
- **Endpoints internos**: Protegidos con `x-internal-key` header; bloqueados por Nginx al exterior

---

## Pruebas

El proyecto incluye **9 archivos de pruebas unitarias** con Jest:

```bash
cd Backend && npm test
```

Módulos con cobertura:
- `auth.service.spec.ts` — Registro, login, tokens
- `tenants.service.spec.ts` — CRUD de tenants
- `products.service.spec.ts` — Catálogo
- `billing.service.spec.ts` — Suscripciones
- `automation.service.spec.ts` — Reglas de automatización
- `plans.service.spec.ts` — Planes de suscripción
- `usage.service.spec.ts` — Conteo de uso
- `usage-limit.guard.spec.ts` — Guard de límites
- `all-exceptions.filter.spec.ts` — Filtro global de errores

---

## Ambientes de Despliegue

### Producción (VPS DigitalOcean)
- Servidor Ubuntu 22.04 LTS
- Nginx como reverse proxy con SSL Let's Encrypt
- PM2 en modo cluster para el backend
- Docker Compose para n8n y Evolution API
- MongoDB Atlas (cluster cloud)

### Desarrollo (Free Tier Cloud)
- **Frontend**: Vercel (siempre activo)
- **Backend**: Render Web Service (free, keep-alive con UptimeRobot)
- **n8n**: Render Docker (free)
- **Evolution API**: Render Docker (free)
- **Base de datos**: MongoDB Atlas M0 (free) + Render PostgreSQL (free)

---

## Colaboradores

| Integrante | GitHub | Rol |
|---|---|---|
| Miguel Ángel Henao Cañas | [@HenaoM7](https://github.com/HenaoM7) | Backend, DevOps, Despliegue |
| Luis Fernando Rojas Correa | [@FerchoRC](https://github.com/FerchoRC) | Frontend, Diseño UI/UX |
