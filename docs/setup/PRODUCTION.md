# Guía de Despliegue en Producción

## Infraestructura Mínima (Fase 1 — Todo en un VPS)

### Servidor Recomendado
- **RAM:** 4 GB mínimo (8 GB recomendado)
- **CPU:** 2 vCPU
- **Disco:** 40 GB SSD
- **OS:** Ubuntu 22.04 LTS
- **Proveedor:** DigitalOcean, Hetzner, Contabo, Vultr

### Stack en Producción (Fase 1)
```
VPS Ubuntu 22.04
├── Nginx (reverse proxy + SSL)
├── Docker Compose
│   ├── n8n (puerto interno 5678)
│   ├── MongoDB (puerto interno 27017)
│   ├── Redis (puerto interno 6379)
│   └── Evolution API (puerto interno 8080)
└── Certbot (SSL automático)
```

---

## Variables de Entorno de Producción

**NUNCA** usar las credenciales por defecto en producción.

```bash
# Generar contraseñas seguras
openssl rand -base64 32  # Para cada contraseña

# Variables CRÍTICAS a cambiar
N8N_BASIC_AUTH_PASSWORD=<contraseña-segura>
MONGO_INITDB_ROOT_PASSWORD=<contraseña-segura>
EVOLUTION_API_KEY=<api-key-segura>
WEBHOOK_URL=https://tu-dominio.com
```

---

## Proceso de Despliegue Inicial

```bash
# 1. Conectar al VPS
ssh root@<ip-del-servidor>

# 2. Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# 3. Instalar Nginx y Certbot
apt install nginx certbot python3-certbot-nginx -y

# 4. Clonar repositorio
git clone https://github.com/tu-org/econodo.git /opt/econodo
cd /opt/econodo

# 5. Configurar variables de entorno
cp infrastructure/docker/.env.example infrastructure/docker/.env
nano infrastructure/docker/.env  # Editar con valores de producción

# 6. Levantar servicios
docker compose -f infrastructure/docker/docker-compose.yml \
               -f infrastructure/docker/docker-compose.prod.yml up -d

# 7. Configurar Nginx
# (Ver configuración de Nginx abajo)

# 8. Obtener certificado SSL
certbot --nginx -d tu-dominio.com -d n8n.tu-dominio.com
```

---

## Configuración Nginx (Ejemplo)

Crear `/etc/nginx/sites-available/econodo`:

```nginx
# n8n
server {
    server_name n8n.tu-dominio.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Evolution API (solo webhooks, no exponer al público)
server {
    server_name evolution.tu-dominio.com;

    location /webhook {
        proxy_pass http://localhost:8080/webhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Bloquear acceso al resto de la API Evolution en prod
    location / {
        deny all;
    }
}
```

---

## Backups

```bash
# Configurar backup automático (cron diario)
crontab -e
# Agregar: 0 2 * * * /opt/econodo/scripts/backup.sh
```

El script `scripts/backup.sh` hace:
1. Dump de MongoDB
2. Exportar workflows de n8n
3. Comprimir y guardar en `/backups/`
4. Opcionalmente subir a S3/R2

---

## Escalabilidad Progresiva

### Fase 1: Monolito en VPS (actual)
- Todo en un servidor
- Docker Compose
- Adecuado hasta ~50 tenants activos

### Fase 2: Separar Backend API
- Backend en servidor dedicado o Railway/Render
- MongoDB Atlas o servidor dedicado
- n8n + Evolution en VPS original

### Fase 3: Múltiples n8n workers
- n8n en modo queue con Redis
- Múltiples workers para escalar procesamiento
- Adecuado hasta ~500 tenants activos

### Fase 4: Microservicios
- Cada dominio como servicio independiente
- Kubernetes o managed containers
- Para escala enterprise (1000+ tenants)

---

## Monitoreo en Producción

### Recomendados para Fase 1 (bajo costo)
- **UptimeRobot** — Monitoreo de disponibilidad (gratis)
- **n8n Execution Log** — Monitoreo de workflows desde la UI
- **Grafana + Prometheus** — Métricas (cuando el equipo crezca)

### Alertas mínimas
- Servicio n8n caído
- MongoDB sin espacio en disco
- Evolution API disconnected

---

## Seguridad en Producción

- [ ] Cambiar todas las contraseñas por defecto
- [ ] MongoDB no expuesto públicamente (solo red Docker interna)
- [ ] Nginx con SSL activo
- [ ] Firewall: solo puertos 80, 443, 22 abiertos externamente
- [ ] SSH solo por clave, no contraseña
- [ ] Backup automático diario
- [ ] n8n Basic Auth o API Key para acceso al panel
