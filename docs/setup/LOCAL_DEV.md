# Guía de Desarrollo Local

## Prerequisitos

| Herramienta | Versión mínima | Verificar |
|------------|---------------|-----------|
| Docker Desktop | 4.x | `docker --version` |
| Docker Compose | 2.x | `docker compose version` |
| Node.js | 18.x | `node --version` |
| ngrok | Cualquiera | `ngrok version` |

---

## 1. Configurar Variables de Entorno

```bash
# Copiar plantilla
cp infrastructure/docker/.env.example infrastructure/docker/.env

# Editar con tus valores
# En Windows: notepad infrastructure/docker/.env
```

Variables mínimas a configurar:
- `N8N_BASIC_AUTH_PASSWORD`: Contraseña del panel n8n
- `WEBHOOK_URL`: URL pública de ngrok (ver paso 4)
- `EVOLUTION_API_KEY`: API key de Evolution API

---

## 2. Levantar Infraestructura

```bash
# Desde la raíz del proyecto
bash scripts/start.sh

# O directamente con Docker Compose
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Verificar que todos los contenedores estén corriendo:
```bash
docker compose -f infrastructure/docker/docker-compose.yml ps
```

Deberías ver estos servicios:
| Contenedor | Puerto | Estado |
|-----------|--------|--------|
| eco_n8n | 5678 | Up |
| eco_mongodb | 27017 | Up |
| eco_mongo_express | 8081 | Up |
| eco_evolution | 8080 | Up |
| eco_evolution_postgres | 5432 | Up |
| eco_evolution_redis | 6379 | Up |

---

## 3. Configurar n8n

1. Abrir http://localhost:5678
2. Crear cuenta de admin
3. Ir a Settings → API → Generate API Key
4. Copiar la API key al archivo `apps/n8n-assistant/.mcp.json`

---

## 4. Configurar Tunnel ngrok

ngrok es necesario para que Evolution API pueda enviar webhooks a n8n en local.

```bash
# Terminal 1: Iniciar ngrok
ngrok http 5678

# Copiar la URL HTTPS generada (ej: https://abc123.ngrok-free.app)
# Actualizar WEBHOOK_URL en infrastructure/docker/.env
# Reiniciar n8n:
docker compose -f infrastructure/docker/docker-compose.yml restart n8n
```

---

## 5. Conectar WhatsApp en Evolution API

1. Abrir Evolution API: http://localhost:8080
2. Crear una instancia con nombre único (ej: `mi_negocio_01`)
3. Generar QR code
4. Escanear con WhatsApp desde el teléfono
5. Configurar webhook:
   ```
   URL: https://[tu-ngrok-url]/webhook/evolution
   Events: MESSAGES_UPSERT
   ```

---

## 6. Importar Workflows Base en n8n

```bash
# Los workflows base están en n8n/workflows/core/
# Importarlos desde n8n UI: Workflows → Import from File
```

O usar el n8n Assistant (IA):
```bash
cd apps/n8n-assistant
# Abrir Claude Code aquí - tiene el MCP server configurado
# y 7 skills especializados para crear workflows
```

---

## Servicios y URLs

| Servicio | URL Local | Notas |
|---------|-----------|-------|
| n8n UI | http://localhost:5678 | Panel de workflows |
| n8n API | http://localhost:5678/api/v1 | Swagger: /api-docs |
| MongoDB Express | http://localhost:8081 | Visor de DB |
| Evolution API | http://localhost:8080 | Gestión WhatsApp |

---

## Logs y Debugging

```bash
# Ver logs de todos los servicios
docker compose -f infrastructure/docker/docker-compose.yml logs -f

# Ver logs de un servicio específico
docker compose -f infrastructure/docker/docker-compose.yml logs -f eco_n8n
docker compose -f infrastructure/docker/docker-compose.yml logs -f eco_evolution

# Ver ejecuciones en n8n
# UI → Executions (panel izquierdo)
```

---

## Detener y Limpiar

```bash
# Detener sin borrar datos
bash scripts/stop.sh

# Detener y borrar volúmenes (¡BORRA DATOS!)
docker compose -f infrastructure/docker/docker-compose.yml down -v
```

---

## Solución de Problemas Comunes

### n8n no conecta a MongoDB
```bash
# Verificar que MongoDB está corriendo
docker compose -f infrastructure/docker/docker-compose.yml ps eco_mongodb
# Ver logs de conexión
docker compose -f infrastructure/docker/docker-compose.yml logs eco_n8n | grep -i mongo
```

### Evolution API no recibe mensajes
1. Verificar que ngrok está corriendo y la URL está actualizada en `.env`
2. Verificar que el webhook está configurado en Evolution API
3. La instancia de WhatsApp debe estar en estado "connected"

### Webhook de n8n no se activa
1. El workflow en n8n debe estar **activado** (toggle en la parte superior)
2. La URL del webhook en n8n debe coincidir con la configurada en Evolution API
