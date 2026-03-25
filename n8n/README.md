# n8n — Workflows de Econodo

> CAPA 6: Orquestador de automatizaciones. Ejecuta, no gobierna.

---

## Principio Fundamental

n8n **nunca** tiene configuración hardcodeada de tenants.

Cada vez que llega un mensaje de WhatsApp, n8n:
1. Identifica al tenant por la instancia de Evolution API
2. Consulta al Backend API para obtener la configuración actual
3. Ejecuta la lógica según esa configuración
4. Registra el uso en el Backend API

Esto permite que los tenants cambien su configuración en tiempo real desde el panel admin, sin tocar un solo workflow.

---

## Estructura de Workflows

```
workflows/
├── core/                        # Workflows del sistema (NO modificar sin pruebas)
│   ├── 01-router-entrante.json  # Router principal de mensajes
│   ├── 02-handler-ia.json       # Procesamiento con IA
│   ├── 03-handler-fuera-horario.json
│   ├── 04-registrar-uso.json    # Registro de consumo
│   └── 05-error-handler.json    # Manejo de errores globales
│
└── templates/                   # Templates para crear workflows de tenants
    ├── restaurante.json          # Template para restaurantes
    ├── clinica.json              # Template para clínicas/consultorios
    └── ecommerce.json            # Template para tiendas online
```

---

## Workflow Core: Router de Mensajes Entrantes

```
[Evolution API Webhook]
        │
        ▼
[Extraer datos del mensaje]
  └── phone, message, instanceName, media
        │
        ▼
[GET Backend API /internal/tenant/by-instance/:instanceName]
  └── Obtener config del tenant
        │
        ▼ (switch por resultado)
┌───────┴──────────────────────────────┐
│                                       │
▼                                       ▼
[Tenant no encontrado]         [Tenant encontrado]
[Ignorar silenciosamente]              │
                                       ▼
                               [¿Tenant activo?]
                               ┌───────┴──────┐
                               ▼               ▼
                           [No activo]    [Activo]
                           [Sin respuesta]     │
                                               ▼
                                    [¿Dentro de horario?]
                                    ┌──────────┴──────┐
                                    ▼                   ▼
                               [Fuera de          [En horario]
                               horario]                │
                               [Mensaje OOH]           ▼
                                               [Handler de IA]
                                                        │
                                                        ▼
                                               [Enviar respuesta
                                               via Evolution API]
                                                        │
                                                        ▼
                                               [Registrar uso]
```

---

## Cómo Exportar Workflows para Versionado

Desde n8n UI:
1. Abrir el workflow
2. Menú (...) → Export → Download
3. Guardar el JSON en la carpeta correspondiente
4. **IMPORTANTE:** Antes de guardar, revisar que no haya credenciales embebidas

O via CLI del n8n-assistant (IA):
```
# En apps/n8n-assistant/, pedirle a Claude:
"Exporta el workflow [nombre] y guárdalo en n8n/workflows/core/"
```

---

## Convenciones de Nombres de Workflows

| Prefijo | Uso | Ejemplo |
|---------|-----|---------|
| `[Core]` | Workflows del sistema | `[Core] Router mensajes entrantes` |
| `[Template]` | Base para tenants | `[Template] Restaurante` |
| `[Tenant]` | Workflow de un tenant específico | `[Tenant] Restaurante ABC` |
| `[Dev]` | Solo para desarrollo/pruebas | `[Dev] Test webhook` |

---

## Herramienta de Desarrollo: n8n-assistant

Para crear y gestionar workflows con IA:

```bash
# Ir al directorio del asistente
cd ../apps/n8n-assistant

# Abrir Claude Code (tiene MCP server configurado)
# El asistente tiene 7 skills especializados:
# - n8n Expression Syntax
# - n8n MCP Tools Expert
# - n8n Workflow Patterns
# - n8n Validation Expert
# - n8n Node Configuration
# - n8n Code JavaScript
# - n8n Code Python
```

Ver [apps/n8n-assistant/CLAUDE.md](../apps/n8n-assistant/CLAUDE.md) para instrucciones completas.
