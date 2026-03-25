# ADR-001: Stack Tecnológico Inicial

**Estado:** Aceptado
**Fecha:** 2025-02-17
**Autores:** Equipo Econodo

---

## Contexto

Necesitamos definir el stack tecnológico para una plataforma SaaS multi-tenant de automatización vía WhatsApp. Los criterios clave son:
- Velocidad de desarrollo en fase inicial
- Capacidad de escalar sin reescribir
- Ecosistema de integraciones rico
- Costo operativo bajo en inicio

---

## Decisiones

### Backend API: NestJS + TypeScript

**Por qué NestJS sobre Express puro:**
- Estructura modular desde el inicio (crítico para multi-tenant)
- Inyección de dependencias nativa
- Decoradores para roles y guards (JWT)
- Comunidad grande, documentación excelente
- Migración a microservicios más sencilla a futuro

**Alternativas consideradas:**
- Fastify puro: más rápido pero menos estructura
- Django/FastAPI: cambio de lenguaje innecesario
- Go: curva de aprendizaje alta para el equipo actual

---

### Base de datos principal: MongoDB

**Por qué MongoDB sobre PostgreSQL:**
- Esquema flexible: la config de cada tenant es diferente y evoluciona
- JSON nativo: los prompts, reglas y configs son documentos JSON
- No hay relaciones complejas entre tenants
- Escala horizontal más sencilla a futuro
- n8n ya tiene soporte nativo para MongoDB

**Cuándo reconsiderar:**
- Si aparecen reportes complejos que requieren JOINs
- Si el modelo de datos se vuelve altamente relacional

---

### Orquestador: n8n

**Por qué n8n:**
- Visual, permite a no-desarrolladores entender los flujos
- 400+ integraciones nativas (APIs externas, IA, DBs)
- Self-hosted: datos del cliente no salen del servidor
- API para gestión programática (crear/modificar workflows vía API)
- Comunidad activa, actualizaciones frecuentes

**Por qué n8n NO es el backend:**
- No maneja autenticación empresarial
- No tiene control de roles por tenant
- No es una API REST robusta para consumo externo
- No gestiona facturación ni límites por plan

**Límite claro:** n8n ejecuta, el Backend API gobierna.

---

### WhatsApp: Evolution API

**Por qué Evolution API:**
- Open source, self-hosted (cero costo por mensaje)
- Multi-instancia: una instancia de WhatsApp por tenant
- Webhook configurable (envía eventos a n8n)
- API REST bien documentada
- Soporte para WhatsApp Business y personal

**Riesgo:**
- WhatsApp puede banear cuentas que usen APIs no oficiales
- Mitigación: ofrecer Meta Cloud API como alternativa premium

**Alternativas:**
- Meta Cloud API oficial: requiere aprobación, costo por mensaje
- Twilio: costo por mensaje, más estable
- Diseño del sistema permite reemplazar solo la Capa 7

---

### Cache / Rate Limit: Redis

**Por qué Redis:**
- Rate limiting nativo (INCR + EXPIRE)
- Cache de configuración de tenants (evita queries repetidas a Mongo)
- Manejo de sesiones de conversación (estado entre mensajes)
- Pub/Sub para eventos internos a futuro

---

### Frontend: Next.js 14

**Por qué Next.js:**
- SSR para mejor SEO del panel público
- App Router para layouts anidados por rol
- TypeScript nativo
- Despliegue sencillo en Vercel o self-hosted

---

## Consecuencias

**Positivas:**
- Stack JavaScript/TypeScript end-to-end (un solo lenguaje)
- Cada pieza puede escalarse independientemente
- n8n permite iterar la lógica de automatización sin deployments

**Negativas:**
- MongoDB requiere disciplina en la estructura de datos
- n8n añade complejidad operativa (un servicio más que mantener)
- Evolution API tiene riesgo de estabilidad con WhatsApp
