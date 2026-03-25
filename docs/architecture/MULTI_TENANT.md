# Diseño Multi-Tenant — Econodo

## Modelo de Aislamiento

Econodo usa el patrón **Shared Database, Shared Schema** con discriminador por `tenantId`.

Esto significa:
- Una sola instancia de MongoDB para todos los tenants
- Cada documento tiene un campo `tenantId`
- El Backend API nunca devuelve datos de un tenant a otro
- n8n solo recibe la configuración del tenant que corresponde al mensaje

---

## Ciclo de Vida de un Tenant

```
1. REGISTRO
   Dueño de negocio → Panel Admin → Crear cuenta
   Backend crea:
   └── User (rol: owner)
   └── Tenant (plan: free, isActive: false)

2. CONFIGURACIÓN
   Owner → Panel Admin → Configurar negocio
   Backend actualiza tenant.config:
   └── Nombre del negocio
   └── Prompt de IA
   └── Horarios de atención
   └── Mensaje de bienvenida
   └── Reglas personalizadas

3. CONEXIÓN WHATSAPP
   Owner → Panel Admin → Conectar WhatsApp
   Backend:
   └── Llama a Evolution API → Crear instancia
   └── Genera QR code
   └── Owner escanea QR con WhatsApp Business
   └── Actualiza tenant.evolutionInstance

4. ACTIVACIÓN
   Owner confirma conexión → Backend activa tenant
   └── tenant.isActive = true
   └── Workflows de n8n comienzan a atender mensajes

5. OPERACIÓN
   Mensajes llegan → n8n procesa según config del tenant
   Backend registra:
   └── Uso diario (mensajes, tokens IA)
   └── Verifica límites del plan

6. BILLING
   Cada primer día del mes:
   └── Backend calcula uso del mes anterior
   └── Genera factura según plan
   └── Notifica al owner
```

---

## Estructura de la Colección `tenants`

```javascript
{
  _id: ObjectId("..."),
  tenantId: "tenant_abc123",        // ID único e inmutable

  // Datos del negocio
  name: "Restaurante El Buen Sabor",
  phone: "+57300xxxxxxx",           // WhatsApp Business number
  email: "owner@negocio.com",

  // Plan y estado
  plan: "pro",                       // free | pro | enterprise
  isActive: true,

  // Configuración personalizable por el owner (sin tocar código)
  config: {
    aiPrompt: "Eres un asistente del Restaurante El Buen Sabor...",
    greeting: "¡Bienvenido! ¿En qué puedo ayudarte?",
    outOfHoursMsg: "Estamos cerrados. Atendemos de 8am a 10pm.",
    schedule: {
      timezone: "America/Bogota",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      openTime: "08:00",
      closeTime: "22:00"
    },
    language: "es",
    aiModel: "claude-3-haiku",      // Modelo asignado según plan
    customRules: [
      {
        trigger: "reserva",
        action: "show_reservation_form"
      }
    ]
  },

  // Integración Evolution API
  evolutionInstance: {
    instanceName: "tenant_abc123_wa",
    status: "connected",            // connected | disconnected | pending
    phoneConnected: "+57300xxxxxxx"
  },

  // Metadata
  createdAt: ISODate("2025-01-01"),
  updatedAt: ISODate("2025-02-17")
}
```

---

## Cómo n8n Obtiene la Configuración del Tenant

n8n **nunca** tiene config hardcodeada de tenants.

El flujo es:

```
1. Evolution API → n8n webhook (mensaje entrante)
   Payload: { phone: "+57300xxx", message: "Hola", instance: "tenant_abc_wa" }

2. n8n extrae el instanceName del webhook

3. n8n → Backend API
   GET /internal/tenant/by-instance/tenant_abc_wa
   Headers: { x-internal-key: "..." }

4. Backend responde:
   {
     tenantId: "tenant_abc123",
     config: { aiPrompt: "...", schedule: {...}, ... },
     plan: "pro",
     limits: { messagesPerDay: 1000, aiTokensPerMonth: 500000 }
   }

5. n8n ejecuta la lógica usando esa config
   - ¿Está dentro del horario? → usar schedule
   - ¿Qué prompt usar? → config.aiPrompt
   - ¿Qué modelo de IA? → config.aiModel

6. n8n → Backend API
   POST /internal/usage/record
   { tenantId: "tenant_abc123", type: "message", tokensUsed: 234 }
```

---

## Límites por Plan

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Mensajes/día | 100 | 1,000 | Ilimitado |
| Tokens IA/mes | 50,000 | 500,000 | Custom |
| Instancias WhatsApp | 1 | 3 | Custom |
| Historial | 7 días | 90 días | Custom |
| Soporte | Email | Priority | Dedicado |
| Precio/mes | $0 | $49 | Custom |

---

## Seguridad Multi-Tenant

### Backend API
- Cada JWT contiene el `tenantId` del usuario
- Todos los queries de MongoDB incluyen `{ tenantId: req.tenantId }`
- Nunca se puede acceder a datos de otro tenant

### n8n Interno
- n8n llama al Backend con un token interno (`x-internal-key`)
- El Backend valida que la instancia pertenece al tenant correcto
- n8n solo recibe la config del tenant que le corresponde

### MongoDB
- No expuesto públicamente (solo acceso interno Docker network)
- Una sola DB, separación por `tenantId` en cada colección
- Índices por `tenantId` para performance
