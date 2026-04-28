import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode,
  BadRequestException, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantsService } from '../tenants/tenants.service';
import { UsageService } from '../usage/usage.service';
import { TenantConfigService } from '../tenant-config/tenant-config.service';
import { AutomationService } from '../automation/automation.service';
import { ProductsService } from '../products/products.service';
import { CatalogPdfService } from '../catalog-pdf/catalog-pdf.service';
import { SalesService } from '../sales/sales.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ReferencesService } from '../references/references.service';
import { ChannelsService } from '../channels/channels.service';
import { InternalKeyGuard } from './guards/internal-key.guard';
import { UsageLimitGuard } from './guards/usage-limit.guard';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';

// Endpoints EXCLUSIVOS para n8n — NO usa JWT, usa x-internal-key
// En producción: Nginx debe bloquear /internal/* desde internet
@ApiTags('Internal (n8n)')
@ApiHeader({ name: 'x-internal-key', description: 'Clave interna para n8n', required: true })
@UseGuards(InternalKeyGuard)
@Controller('internal')
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  constructor(
    private config: ConfigService,
    private tenantsService: TenantsService,
    private usageService: UsageService,
    private tenantConfigService: TenantConfigService,
    private automationService: AutomationService,
    private productsService: ProductsService,
    private catalogPdfService: CatalogPdfService,
    private salesService: SalesService,
    private conversationsService: ConversationsService,
    private referencesService: ReferencesService,
    private channelsService: ChannelsService,
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
  ) {}

  // n8n llama esto al arrancar el flujo operativo (llegó un mensaje de WhatsApp)
  // Devuelve tenant + businessConfig (configuración del negocio) + plan + uso actual
  @Get('tenant/by-instance/:instanceName')
  @ApiOperation({
    summary: '[n8n] Obtener config del tenant por instancia Evolution API',
    description:
      'n8n llama a este endpoint cuando llega un mensaje. Devuelve businessConfig para que n8n ejecute la lógica del negocio.',
  })
  async getTenantByInstance(@Param('instanceName') instanceName: string) {
    const tenant = await this.tenantsService.findByInstance(instanceName);
    if (!tenant) return { found: false };

    const [usage, businessConfig, canProcess, products, references] = await Promise.all([
      this.usageService.getUsage(tenant.tenantId),
      this.tenantConfigService.findByTenantId(tenant.tenantId),
      this.usageService.canProcess(tenant.tenantId),
      this.productsService.search(tenant.tenantId, '', 100),
      this.referencesService.findActive(tenant.tenantId),
    ]);

    // Usar productos del módulo Products si existen; si no, fallback al catálogo inline de tenant_config
    let finalBusinessConfig: any = businessConfig ? businessConfig.toObject?.() ?? { ...businessConfig } : null;
    if (finalBusinessConfig && products.length > 0) {
      finalBusinessConfig = {
        ...finalBusinessConfig,
        catalog: products.map((p: any) => ({
          name: p.name,
          description: p.description || '',
          price: p.price,
          comparePrice: p.comparePrice,
          category: p.category || '',
          available: p.available,
          imageUrl: p.imageUrl || '',
          sku: p.sku || '',
          tags: p.tags || [],
          stock: p.stock,
        })),
      };
    }

    return {
      found: true,
      tenantId: tenant.tenantId,
      tenantEmail: tenant.email || '',
      isActive: tenant.isActive,
      canProcess,
      plan: usage.plan,
      businessConfig: finalBusinessConfig,
      limits: usage.limits,
      usage: {
        messagesUsed: usage.messagesUsed,
        tokensUsed: usage.tokensUsed,
      },
      // Para tenants con servidor propio: usa sus credenciales
      // Para tenants con conexión QR: usa el servidor global SharkByte (accesible desde Docker)
      evolutionApiUrl:
        tenant.evolutionInstance?.apiUrl?.trim() ||
        this.config.get<string>('EVOLUTION_API_URL_INTERNAL') ||
        'http://eco_evolution:8080',
      evolutionApiKey:
        tenant.evolutionInstance?.apiKey?.trim() ||
        this.config.get<string>('EVOLUTION_API_KEY') ||
        'superapikey',
      hasEvolutionCredentials: true, // siempre true: tenants QR usan servidor global como fallback
      // Referencias activas: webs, APIs, documentos del negocio para respuestas basadas en datos reales
      references: references.map((r: any) => ({
        id: r._id?.toString(),
        name: r.name,
        type: r.type,
        url: r.url,
        description: r.description,
        updateFrequency: r.updateFrequency,
        categories: r.categories,
        lastFetched: r.lastFetched,
      })),
    };
  }

  // Validación rápida para n8n: verifica si un tenant puede procesar mensajes
  @Get('tenant/validate/:tenantId')
  @ApiOperation({
    summary: '[n8n] Validar si el tenant puede procesar mensajes',
    description: 'Verificación rápida de estado activo, límites del plan y credenciales Evolution API.',
  })
  async validateTenant(@Param('tenantId') tenantId: string) {
    const result = await this.usageService.canProcessDetailed(tenantId);
    let usage: any = null;
    try {
      usage = await this.usageService.getUsage(tenantId);
    } catch {
      // tenant no encontrado — result.ok ya es false
    }

    return {
      canProcess: result.ok,
      isActive: result.ok,
      reason: result.reason ?? null,
      plan: usage?.plan ?? null,
      limits: usage?.limits ?? null,
    };
  }

  // @deprecated — Los tenants se crean desde el panel web, no desde n8n
  // Eliminado: retorna 410 Gone
  @Post('tenant')
  @HttpCode(410)
  @ApiOperation({
    summary: '[REMOVED] Endpoint eliminado',
    description: 'Este endpoint fue eliminado. Los tenants se crean desde el panel web.',
    deprecated: true,
  })
  async createTenant(): Promise<never> {
    throw new HttpException(
      {
        statusCode: HttpStatus.GONE,
        message: 'Este endpoint fue eliminado. Los tenants se crean desde el panel web en /api/v1/tenants.',
      },
      HttpStatus.GONE,
    );
  }

  // n8n registra uso DESPUÉS de procesar el mensaje
  // UsageLimitGuard verifica ANTES que no haya superado el límite (retorna 429 si supera)
  @Post('usage/record')
  @UseGuards(UsageLimitGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(200)
  @ApiOperation({
    summary: '[n8n] Registrar uso de mensajes y tokens',
    description: 'UsageLimitGuard bloquea con 429 si el plan está agotado. Rate limit: 30 req/min.',
  })
  async recordUsage(
    @Body() body: { tenantId: string; messages?: number; tokens?: number },
  ) {
    await this.usageService.recordUsage(
      body.tenantId,
      body.messages || 1,
      body.tokens || 0,
    );
    return { ok: true };
  }

  // n8n verifica antes de procesar si el tenant puede recibir más mensajes este mes
  @Get('tenant/:tenantId/can-process')
  @ApiOperation({
    summary: '[n8n] Verificar si el tenant puede procesar un mensaje',
    description: 'Verifica plan activo, credenciales y que no haya superado los límites mensuales.',
  })
  async canProcess(@Param('tenantId') tenantId: string) {
    const canProcess = await this.usageService.canProcess(tenantId);
    const usage = await this.usageService.getUsage(tenantId);

    return {
      canProcess,
      messagesRemaining:
        usage.limits.maxMessages === -1
          ? -1
          : usage.limits.maxMessages - usage.messagesUsed,
      tokensRemaining:
        usage.limits.maxTokens === -1
          ? -1
          : usage.limits.maxTokens - usage.tokensUsed,
    };
  }

  // n8n lee las reglas activas del tenant para aplicarlas al procesar mensajes
  @Get('tenant/:tenantId/automation-rules')
  @ApiOperation({
    summary: '[n8n] Obtener reglas de automatización activas del tenant',
    description: 'Devuelve las reglas activas ordenadas por prioridad para que n8n las evalúe.',
  })
  async getAutomationRules(@Param('tenantId') tenantId: string) {
    const rules = await this.automationService.getRulesForTenant(tenantId);
    return { tenantId, rules };
  }

  // n8n busca productos del tenant (sub-workflow Ventas)
  @Get('products')
  @ApiOperation({
    summary: '[n8n] Buscar productos disponibles del tenant',
    description: 'Búsqueda de texto en nombre, descripción, SKU y categoría. Devuelve solo productos disponibles.',
  })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'query', required: false, description: 'Texto de búsqueda' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchProducts(
    @Query('tenantId') tenantId: string,
    @Query('query') query?: string,
    @Query('limit') limit?: number,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId es requerido');
    }
    const products = await this.productsService.search(tenantId, query || '', Number(limit) || 5);
    return { tenantId, products };
  }

  // n8n obtiene credenciales Google del tenant (para sub-workflow Agendamiento)
  @Get('tenant/:tenantId/google-credentials')
  @ApiOperation({
    summary: '[n8n] Obtener credenciales Google del tenant para sub-workflow Agendamiento',
    description: 'Devuelve Service Account + IDs de Sheets y Calendar. Seguro: Nginx bloquea /internal/* desde internet.',
  })
  async getGoogleCredentials(@Param('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId es requerido');
    const tenant = await this.tenantsService.findById(tenantId);
    const gc = (tenant.googleCredentials as any) ?? {};
    return {
      tenantId,
      hasGoogleCredentials: !!(gc.enabled && gc.clientEmail && gc.privateKey && gc.spreadsheetId),
      enabled:       gc.enabled       ?? false,
      clientEmail:   gc.clientEmail   ?? null,
      privateKey:    gc.privateKey    ?? null,
      spreadsheetId: gc.spreadsheetId ?? null,
      sheetName:     gc.sheetName     ?? 'Citas',
      calendarId:    gc.calendarId    ?? 'primary',
    };
  }

  // n8n obtiene el PDF de catálogo del tenant
  @Get('catalog-pdf')
  @ApiOperation({
    summary: '[n8n] Obtener URL del PDF de catálogo del tenant',
  })
  @ApiQuery({ name: 'tenantId', required: true })
  async getCatalogPdf(@Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId es requerido');
    }
    const pdf = await this.catalogPdfService.findByTenant(tenantId);
    return { tenantId, pdfUrl: pdf?.pdfUrl || null, fileName: pdf?.fileName || null };
  }

  // n8n notifica al tenant cuando un cliente solicita atención humana
  @Post('notify/escalation')
  @HttpCode(200)
  @ApiOperation({
    summary: '[n8n] Enviar email de escalamiento al dueño del negocio',
    description: 'Envía email al tenant cuando un cliente solicita hablar con un agente humano.',
  })
  async notifyEscalation(
    @Body() body: {
      tenantId: string;
      tenantEmail: string;
      clientPhone: string;
      clientName: string;
      clientMessage: string;
      businessName?: string;
    },
  ) {
    if (!body.tenantEmail?.trim() || !body.tenantId?.trim()) {
      return { ok: false, reason: 'tenantEmail y tenantId son requeridos' };
    }

    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (!smtpHost) {
      this.logger.warn(`[Escalamiento] SMTP no configurado — omitiendo email a ${body.tenantEmail}`);
      return { ok: false, reason: 'SMTP no configurado' };
    }

    const businessName = body.businessName || 'tu negocio';
    const subject = `🚨 Cliente solicita atención humana — ${businessName}`;
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #0f172a; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">🚨 Solicitud de Atención Humana</h2>
    <p style="margin: 6px 0 0; opacity: 0.7; font-size: 14px;">${businessName}</p>
  </div>
  <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p style="color: #64748b; font-size: 14px; margin-top: 0;">
      Un cliente de <strong>${businessName}</strong> está solicitando hablar con una persona real.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr style="background: white; border: 1px solid #e2e8f0;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151; width: 30%;">📱 Teléfono</td>
        <td style="padding: 12px 16px; color: #111827;">+${body.clientPhone}</td>
      </tr>
      <tr style="background: #f8fafc; border: 1px solid #e2e8f0;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151;">👤 Nombre</td>
        <td style="padding: 12px 16px; color: #111827;">${body.clientName || 'No especificado'}</td>
      </tr>
      <tr style="background: white; border: 1px solid #e2e8f0;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151; vertical-align: top;">💬 Mensaje</td>
        <td style="padding: 12px 16px; color: #374151; font-style: italic;">"${body.clientMessage || 'Sin mensaje previo'}"</td>
      </tr>
    </table>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 14px; margin-top: 16px;">
      <strong style="color: #92400e;">⏰ Acción requerida:</strong>
      <span style="color: #78350f;"> Contacta a este cliente a la brevedad posible por WhatsApp al número indicado.</span>
    </div>
    <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
      Este mensaje fue generado automáticamente por <strong>SharkByte</strong> — Plataforma SaaS de automatización empresarial.
    </p>
  </div>
</div>`;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.config.get<number>('SMTP_PORT') || 587,
        secure: false,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });

      const from = this.config.get<string>('SMTP_FROM') || 'admin@sharkbyteia.com';
      await transporter.sendMail({ from, to: body.tenantEmail, subject, html });
      this.logger.log(`[Escalamiento] Email enviado a ${body.tenantEmail} — cliente +${body.clientPhone}`);
      return { ok: true };
    } catch (err: any) {
      this.logger.error(`[Escalamiento] Error enviando email a ${body.tenantEmail}: ${err.message}`);
      return { ok: false, reason: err.message };
    }
  }

  // n8n notifica al tenant cuando se confirma una venta
  @Post('notify/sale-confirmed')
  @HttpCode(200)
  @ApiOperation({
    summary: '[n8n] Registrar venta confirmada y enviar email al negocio',
    description: 'Guarda la venta en MongoDB y envía email HTML al dueño del negocio con los detalles del pedido.',
  })
  async notifySaleConfirmed(
    @Body() body: {
      tenantId: string;
      tenantEmail: string;
      businessName?: string;
      clientName?: string;
      clientPhone: string;
      clientId?: string;
      productName?: string;
      productDetails?: string;
      quantity?: number;
      totalAmount?: number | null;
      paymentMessage?: string;
      deliveryAddress?: string;
      confirmedAt?: string;
    },
  ) {
    if (!body.tenantEmail?.trim() || !body.tenantId?.trim()) {
      return { ok: false, reason: 'tenantEmail y tenantId son requeridos' };
    }

    const businessName = body.businessName || 'tu negocio';
    const confirmedAt = body.confirmedAt ? new Date(body.confirmedAt) : new Date();
    const quantity = body.quantity || 1;

    // Guardar venta en MongoDB
    let saleId: string | null = null;
    try {
      const sale = await this.salesService.create({
        tenantId: body.tenantId,
        clientName: body.clientName || '',
        clientPhone: body.clientPhone,
        clientId: body.clientId || '',
        productName: body.productName || '',
        productDetails: body.productDetails || '',
        quantity,
        totalAmount: body.totalAmount ?? null,
        paymentMessage: body.paymentMessage || '',
        deliveryAddress: body.deliveryAddress || '',
        businessName,
        status: 'confirmed',
        confirmedAt,
      });
      saleId = (sale as any)._id?.toString() ?? null;
    } catch (err: any) {
      this.logger.error(`[Ventas] Error guardando venta: ${err.message}`);
    }

    // Enviar email al negocio
    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (!smtpHost) {
      this.logger.warn(`[Ventas] SMTP no configurado — omitiendo email a ${body.tenantEmail}`);
      return { ok: true, saleId, emailSent: false, reason: 'SMTP no configurado' };
    }

    const subject = `Nueva venta confirmada — ${businessName}`;
    const fechaStr = confirmedAt.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const totalStr = body.totalAmount
      ? `$${Number(body.totalAmount).toLocaleString('es-CO')}`
      : 'No especificado';

    const clientIdRow = body.clientId ? `
      <tr style="background: white;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151; width: 35%;">Cédula / Documento</td>
        <td style="padding: 12px 16px; color: #111827;">${body.clientId}</td>
      </tr>` : '';

    const deliveryRow = body.deliveryAddress ? `
      <tr style="background: #f8fafc;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151;">Dirección de entrega</td>
        <td style="padding: 12px 16px; color: #111827;">${body.deliveryAddress}</td>
      </tr>` : '';

    const productDetailsRow = body.productDetails ? `
      <tr style="background: white;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151; vertical-align: top;">Detalles del pedido</td>
        <td style="padding: 12px 16px; color: #374151; white-space: pre-line;">${body.productDetails}</td>
      </tr>` : '';

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff;">
  <div style="background: #0f172a; color: white; padding: 28px 32px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Nueva Venta Confirmada</h2>
    <p style="margin: 6px 0 0; opacity: 0.65; font-size: 14px;">${businessName}</p>
  </div>
  <div style="background: #f8fafc; padding: 28px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p style="color: #64748b; font-size: 14px; margin-top: 0;">
      Un cliente ha completado su proceso de pago en <strong>${businessName}</strong>. A continuación los detalles del pedido.
    </p>

    <p style="font-size: 12px; font-weight: 700; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; margin: 20px 0 8px;">Datos del cliente</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
      <tr style="background: white;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151; width: 35%;">Nombre</td>
        <td style="padding: 12px 16px; color: #111827;">${body.clientName || 'No especificado'}</td>
      </tr>
      <tr style="background: #f8fafc;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151;">Teléfono WhatsApp</td>
        <td style="padding: 12px 16px; color: #111827;">+${body.clientPhone}</td>
      </tr>
      ${clientIdRow}
      ${deliveryRow}
    </table>

    <p style="font-size: 12px; font-weight: 700; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; margin: 20px 0 8px;">Detalle del pedido</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
      <tr style="background: white;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151; width: 35%;">Producto</td>
        <td style="padding: 12px 16px; color: #111827;">${body.productName || 'No especificado'}</td>
      </tr>
      ${productDetailsRow}
      <tr style="background: #f8fafc;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151;">Cantidad</td>
        <td style="padding: 12px 16px; color: #111827;">${quantity}</td>
      </tr>
      <tr style="background: white;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151;">Total</td>
        <td style="padding: 12px 16px; color: #111827; font-weight: 700;">${totalStr}</td>
      </tr>
      <tr style="background: #f8fafc;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151; vertical-align: top;">Mensaje del cliente</td>
        <td style="padding: 12px 16px; color: #374151; font-style: italic; white-space: pre-line;">"${body.paymentMessage || 'Sin mensaje'}"</td>
      </tr>
      <tr style="background: white;">
        <td style="padding: 12px 16px; font-weight: 600; color: #374151;">Fecha y hora</td>
        <td style="padding: 12px 16px; color: #111827;">${fechaStr}</td>
      </tr>
    </table>

    <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 6px; padding: 16px; margin-top: 20px;">
      <strong style="color: #14532d; font-size: 15px;">Pago confirmado</strong><br>
      <span style="color: #166534; font-size: 13px; margin-top: 4px; display: block;">Proceder con la preparación y despacho del pedido.</span>
    </div>

    <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
      Generado automáticamente por <strong>SharkByte</strong> — Plataforma SaaS de automatización empresarial con IA.
    </p>
  </div>
</div>`;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.config.get<number>('SMTP_PORT') || 587,
        secure: false,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });

      const from = this.config.get<string>('SMTP_FROM') || 'admin@sharkbyteia.com';
      await transporter.sendMail({ from, to: body.tenantEmail, subject, html });
      this.logger.log(`[Ventas] Email enviado a ${body.tenantEmail} — cliente +${body.clientPhone}`);
      return { ok: true, saleId, emailSent: true };
    } catch (err: any) {
      this.logger.error(`[Ventas] Error enviando email a ${body.tenantEmail}: ${err.message}`);
      return { ok: true, saleId, emailSent: false, reason: err.message };
    }
  }

  // n8n obtiene ventas pendientes de enviar recordatorio de recompra
  @Get('sales/recompra-pending')
  @ApiOperation({
    summary: '[n8n] Obtener ventas pendientes de recordatorio de recompra',
    description: 'Retorna ventas confirmadas cuyo recompraScheduledFor <= now y recompraSent=false.',
  })
  async getRecompraPending() {
    const sales = await this.salesService.getPendingRecompra();
    return { count: sales.length, sales };
  }

  // n8n marca una venta como recompra enviada
  @Patch('sales/:id/recompra-sent')
  @HttpCode(200)
  @ApiOperation({
    summary: '[n8n] Marcar venta como recordatorio de recompra enviado',
  })
  async markRecompraSent(@Param('id') id: string) {
    await this.salesService.markRecompraSent(id);
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REFERENCES — Fuentes externas registradas para respuestas basadas en datos reales
  // ─────────────────────────────────────────────────────────────────────────

  // n8n consulta las referencias activas del tenant al procesar un mensaje
  // para determinar qué URLs/APIs debe consultar antes de responder
  @Get('references/:tenantId')
  @ApiOperation({
    summary: '[n8n] Obtener referencias activas del tenant',
    description: 'Devuelve todas las referencias activas (web, api, document) para que n8n pueda consultarlas y basar sus respuestas en datos reales del negocio.',
  })
  async getReferences(@Param('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId es requerido');
    const refs = await this.referencesService.findActive(tenantId);
    return { tenantId, references: refs };
  }

  // n8n notifica al backend que actualizó el caché de una referencia
  @Patch('references/:tenantId/:id/fetched')
  @HttpCode(200)
  @ApiOperation({
    summary: '[n8n] Marcar referencia como actualizada (lastFetched = now)',
    description: 'n8n llama esto después de scrappear/actualizar el contenido de la referencia.',
  })
  async markReferenceFetched(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.referencesService.markFetched(tenantId, id);
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONVERSATIONS — Registro de mensajes WhatsApp para el CRM
  // ─────────────────────────────────────────────────────────────────────────

  // n8n llama esto en el Router flow por cada mensaje entrante
  @Post('conversations/upsert')
  @HttpCode(200)
  @ApiOperation({
    summary: '[n8n] Registrar/actualizar conversación (WhatsApp y multi-canal) y agregar mensaje',
    description: 'Upsert de conversación por tenantId+contactPhone+platform. Crea Message y emite SSE al frontend. Para canales distintos a WhatsApp, enviar platform=facebook|instagram|telegram|tiktok.',
  })
  async upsertConversation(
    @Body() body: {
      tenantId: string;
      contactPhone: string;
      contactName?: string;
      message?: string;
      sender?: string;
      type?: string;
      mediaUrl?: string;
      platform?: string; // 'whatsapp' (default) | 'facebook' | 'instagram' | 'telegram' | 'tiktok'
    },
  ) {
    if (!body.tenantId?.trim() || !body.contactPhone?.trim()) {
      return { ok: false, reason: 'tenantId y contactPhone son requeridos' };
    }
    try {
      const result = await this.conversationsService.upsert({
        tenantId: body.tenantId,
        contactPhone: body.contactPhone,
        contactName: body.contactName,
        message: body.message,
        sender: body.sender || 'client',
        type: (body.type as any) || 'text',
        mediaUrl: body.mediaUrl,
        platform: (body.platform as any) || 'whatsapp',
      });
      return { ok: true, conversationId: (result.conversation as any)._id?.toString() };
    } catch (err: any) {
      this.logger.error(`[Conversations] upsert error: ${err.message}`);
      return { ok: false, reason: err.message };
    }
  }

  // n8n lee el estado de ventas de una conversación al inicio del flujo
  @Get('conversations/state')
  @ApiOperation({
    summary: '[n8n] Obtener estado de ventas + últimos mensajes de una conversación',
    description: 'Retorna salesStage, salesData, dealId y últimos N mensajes para que el agente tenga memoria.',
  })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'phone', required: true })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getConversationState(
    @Query('tenantId') tenantId: string,
    @Query('phone') phone: string,
    @Query('platform') platform?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId?.trim() || !phone?.trim()) {
      throw new BadRequestException('tenantId y phone son requeridos');
    }
    return this.conversationsService.getSalesState(tenantId, phone, platform || 'whatsapp', Number(limit) || 10);
  }

  // n8n actualiza el estado de ventas después de evaluar la respuesta del agente
  @Patch('conversations/state')
  @HttpCode(200)
  @ApiOperation({
    summary: '[n8n] Actualizar estado de ventas de una conversación',
    description: 'Actualiza salesStage y salesData. n8n lo llama después de cada respuesta del agente.',
  })
  async updateConversationState(
    @Body() body: {
      tenantId: string;
      phone: string;
      platform?: string;
      salesStage: string;
      salesData?: Record<string, any>;
      category?: string;
      dealId?: string;
    },
  ) {
    if (!body.tenantId?.trim() || !body.phone?.trim() || !body.salesStage?.trim()) {
      throw new BadRequestException('tenantId, phone y salesStage son requeridos');
    }
    const result = await this.conversationsService.updateSalesState(
      body.tenantId,
      body.phone,
      body.platform || 'whatsapp',
      body.salesStage,
      body.salesData,
      { category: body.category, dealId: body.dealId },
    );
    return { ok: !!result, salesStage: body.salesStage };
  }

  // n8n avanza/cierra el deal de un contacto cuando cambia la etapa de la venta
  @Patch('pipeline/deal/by-contact')
  @HttpCode(200)
  @ApiOperation({
    summary: '[n8n] Avanzar deal en pipeline por teléfono de contacto',
    description: 'Mueve el deal abierto del contacto a otro stage o lo marca como won. n8n lo llama en transiciones de etapa.',
  })
  async advanceDealByContact(
    @Body() body: {
      tenantId: string;
      phone: string;
      stageId?: string;
      status?: string;
      value?: number;
      saleId?: string;
    },
  ) {
    if (!body.tenantId?.trim() || !body.phone?.trim()) {
      throw new BadRequestException('tenantId y phone son requeridos');
    }
    const result = await this.conversationsService.advanceDeal(body.tenantId, body.phone, {
      stageId: body.stageId,
      status: body.status,
      value: body.value,
      saleId: body.saleId,
    });
    return { ok: true, dealId: (result as any)?._id?.toString() ?? null };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // APPOINTMENTS — Agendamiento de citas
  // ─────────────────────────────────────────────────────────────────────────

  @Post('appointments')
  @HttpCode(201)
  @ApiOperation({ summary: '[n8n] Guardar cita agendada para sistema de recordatorios' })
  async saveAppointment(@Body() body: any) {
    if (!body.tenantId || !body.clientPhone || !body.appointmentDate || !body.appointmentTime) {
      throw new BadRequestException('tenantId, clientPhone, appointmentDate, appointmentTime son requeridos');
    }

    // Parsear fecha y hora a Date para queries de tiempo
    const [year, month, day] = body.appointmentDate.split('-').map(Number);
    const [hour, minute] = body.appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hour, minute);

    // Buscar cita activa del cliente (por tenantId + phone, status=confirmed)
    // Si existe, se reemplaza con los nuevos datos (un cliente = una cita activa)
    const existing = await this.appointmentModel.findOne({
      tenantId: body.tenantId,
      clientPhone: body.clientPhone,
      status: 'confirmed',
    }).sort({ appointmentDateTime: 1 });

    if (existing) {
      // Reemplazar cita activa con nuevos datos — resetear recordatorios si cambió fecha/hora
      const dateChanged = existing.appointmentDate !== body.appointmentDate || existing.appointmentTime !== body.appointmentTime;
      await this.appointmentModel.updateOne({ _id: existing._id }, {
        clientName: body.clientName || existing.clientName,
        clientEmail: body.clientEmail || existing.clientEmail,
        service: body.service || existing.service,
        employeeName: body.employeeName || existing.employeeName,
        calEventId: body.calEventId || existing.calEventId,
        appointmentDate: body.appointmentDate || existing.appointmentDate,
        appointmentTime: body.appointmentTime || existing.appointmentTime,
        appointmentEndTime: body.appointmentEndTime || existing.appointmentEndTime,
        status: 'confirmed',
        evolutionApiUrl: body.evolutionApiUrl || existing.evolutionApiUrl,
        evolutionApiKey: body.evolutionApiKey || existing.evolutionApiKey,
        appointmentDateTime,
        ...(dateChanged ? { reminder24hSent: false, reminder1hSent: false } : {}),
      });
      this.logger.log(`[Appointments] Cita reemplazada ${existing._id} — cliente +${body.clientPhone} — nueva: ${body.appointmentDate} ${body.appointmentTime}`);
      return { ok: true, id: existing._id.toString(), updated: true };
    }

    const appt = await this.appointmentModel.create({
      tenantId: body.tenantId,
      clientPhone: body.clientPhone,
      clientName: body.clientName || '',
      clientEmail: body.clientEmail || '',
      service: body.service || 'Cita',
      employeeName: body.employeeName || '',
      appointmentDate: body.appointmentDate,
      appointmentTime: body.appointmentTime,
      appointmentEndTime: body.appointmentEndTime || '',
      appointmentDateTime,
      status: 'confirmed',
      calEventId: body.calEventId || '',
      reminder24hSent: false,
      reminder1hSent: false,
      evolutionApiUrl: body.evolutionApiUrl || '',
      evolutionApiKey: body.evolutionApiKey || '',
    });

    this.logger.log(`[Appointments] Cita guardada ${appt._id} — tenant ${body.tenantId} — cliente +${body.clientPhone} — ${body.appointmentDate} ${body.appointmentTime}`);
    return { ok: true, id: appt._id.toString(), updated: false };
  }

  @Get('appointments/pending-reminders')
  @ApiOperation({ summary: '[n8n Cron] Obtener citas que necesitan recordatorio (24h o 1h antes)' })
  async getPendingReminders() {
    const now = new Date();
    const in1h = new Date(now.getTime() + 65 * 60 * 1000);   // +65 min (ventana 5min antes del trigger)
    const in1hStart = new Date(now.getTime() + 55 * 60 * 1000);
    const in24h = new Date(now.getTime() + 25 * 60 * 60 * 1000);  // +25h
    const in24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    const [reminders1h, reminders24h] = await Promise.all([
      // Citas en ~1h, recordatorio 1h no enviado
      this.appointmentModel.find({
        status: 'confirmed',
        reminder1hSent: false,
        appointmentDateTime: { $gte: in1hStart, $lte: in1h },
      }).lean(),
      // Citas en ~24h, recordatorio 24h no enviado
      this.appointmentModel.find({
        status: 'confirmed',
        reminder24hSent: false,
        appointmentDateTime: { $gte: in24hStart, $lte: in24h },
      }).lean(),
    ]);

    const reminders = [
      ...reminders1h.map((a: any) => ({ ...a, reminderType: '1h' })),
      ...reminders24h.map((a: any) => ({ ...a, reminderType: '24h' })),
    ];

    return { count: reminders.length, reminders };
  }

  @Patch('appointments/:id/reminder-sent')
  @HttpCode(200)
  @ApiOperation({ summary: '[n8n Cron] Marcar recordatorio de cita como enviado' })
  async markReminderSent(@Param('id') id: string, @Body() body: { reminderType: '1h' | '24h' }) {
    const update = body.reminderType === '1h'
      ? { reminder1hSent: true }
      : { reminder24hSent: true };
    await this.appointmentModel.updateOne({ _id: id }, update);
    return { ok: true };
  }

  @Patch('appointments/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: '[n8n] Cancelar una cita por calEventId' })
  async cancelAppointment(@Body() body: { tenantId: string; calEventId: string }) {
    if (!body.calEventId) throw new BadRequestException('calEventId requerido');
    await this.appointmentModel.updateOne(
      { tenantId: body.tenantId, calEventId: body.calEventId },
      { status: 'cancelled' },
    );
    return { ok: true };
  }

  @Patch('appointments/update')
  @HttpCode(200)
  @ApiOperation({ summary: '[n8n] Actualizar cita existente por calEventId (reemplaza con nuevo evento)' })
  async updateAppointment(@Body() body: {
    tenantId: string;
    oldCalEventId: string;
    newCalEventId?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    appointmentEndTime?: string;
    employeeName?: string;
    service?: string;
    clientName?: string;
    clientEmail?: string;
  }) {
    if (!body.tenantId || !body.oldCalEventId) {
      throw new BadRequestException('tenantId y oldCalEventId requeridos');
    }
    const update: any = { reminder24hSent: false, reminder1hSent: false };
    if (body.newCalEventId)    update.calEventId = body.newCalEventId;
    if (body.appointmentDate)  update.appointmentDate = body.appointmentDate;
    if (body.appointmentTime)  update.appointmentTime = body.appointmentTime;
    if (body.appointmentEndTime) update.appointmentEndTime = body.appointmentEndTime;
    if (body.employeeName)     update.employeeName = body.employeeName;
    if (body.service)          update.service = body.service;
    if (body.clientName)       update.clientName = body.clientName;
    if (body.clientEmail)      update.clientEmail = body.clientEmail;
    if (body.appointmentDate && body.appointmentTime) {
      const [y, m, d] = body.appointmentDate.split('-').map(Number);
      const [h, min] = body.appointmentTime.split(':').map(Number);
      update.appointmentDateTime = new Date(y, m - 1, d, h, min);
    }
    const result = await this.appointmentModel.findOneAndUpdate(
      { tenantId: body.tenantId, calEventId: body.oldCalEventId },
      update,
      { new: true },
    );
    if (!result) return { ok: false, message: 'Cita no encontrada' };
    this.logger.log(`[Appointments] Cita actualizada: ${result._id} — nuevo calEventId=${body.newCalEventId || body.oldCalEventId}`);
    return { ok: true, id: result._id.toString() };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MULTI-CANAL — Endpoints para flujos n8n de Facebook, Instagram, Telegram, TikTok
  // ─────────────────────────────────────────────────────────────────────────

  // Equivalente a by-instance pero usando tenantId directamente.
  // Los flujos multi-canal ya conocen el tenantId (enviado por el webhook del backend).
  @Get('tenant/by-tenantid/:tenantId')
  @ApiOperation({
    summary: '[n8n Multi-Canal] Obtener config del tenant por tenantId',
    description: 'Retorna businessConfig, plan, usage y referencias. Equivalente a by-instance pero para canales no-WhatsApp.',
  })
  async getTenantByTenantId(@Param('tenantId') tenantId: string) {
    if (!tenantId?.trim()) return { found: false };

    let tenant: any;
    try {
      tenant = await this.tenantsService.findById(tenantId);
    } catch {
      return { found: false };
    }
    if (!tenant) return { found: false };

    const [usage, businessConfig, canProcess, products, references] = await Promise.all([
      this.usageService.getUsage(tenant.tenantId),
      this.tenantConfigService.findByTenantId(tenant.tenantId),
      this.usageService.canProcess(tenant.tenantId),
      this.productsService.search(tenant.tenantId, '', 100),
      this.referencesService.findActive(tenant.tenantId),
    ]);

    let finalBusinessConfig: any = businessConfig
      ? businessConfig.toObject?.() ?? { ...businessConfig }
      : null;

    if (finalBusinessConfig && products.length > 0) {
      finalBusinessConfig = {
        ...finalBusinessConfig,
        catalog: products.map((p: any) => ({
          name: p.name,
          description: p.description || '',
          price: p.price,
          comparePrice: p.comparePrice,
          category: p.category || '',
          available: p.available,
          imageUrl: p.imageUrl || '',
          sku: p.sku || '',
        })),
      };
    }

    return {
      found: true,
      tenantId: tenant.tenantId,
      tenantEmail: tenant.email || '',
      businessName: tenant.businessName || '',
      isActive: tenant.isActive !== false,
      plan: tenant.plan?.name ?? 'free',
      evolutionApiUrl: tenant.evolutionApiUrl || '',
      evolutionApiKey: tenant.evolutionApiKey || '',
      usage,
      limits: { canProcess },
      businessConfig: finalBusinessConfig,
      references,
    };
  }

  // n8n llama esto para obtener las credenciales del canal y poder enviar la respuesta
  @Get('channels/:tenantId/:platform')
  @ApiOperation({
    summary: '[n8n Multi-Canal] Obtener credenciales del canal para enviar respuesta',
    description: 'Devuelve accessToken, botToken, tiktokAccessToken según la plataforma. Usado por los flujos n8n para enviar mensajes de respuesta.',
  })
  async getChannelConfig(
    @Param('tenantId') tenantId: string,
    @Param('platform') platform: string,
  ) {
    if (!tenantId?.trim() || !platform?.trim()) {
      return { found: false };
    }
    const channel = await this.channelsService.findByTenantAndPlatform(tenantId, platform);
    if (!channel) return { found: false };
    return { found: true, ...channel };
  }

  // n8n registra el canal como activo tras enviar un mensaje exitosamente
  @Patch('channels/:tenantId/:platform/ping')
  @HttpCode(200)
  @ApiOperation({ summary: '[n8n Multi-Canal] Marcar canal como activo (lastActive = now)' })
  async pingChannel(
    @Param('tenantId') tenantId: string,
    @Param('platform') platform: string,
  ) {
    const channel = await this.channelsService.findByTenantAndPlatform(tenantId, platform);
    if (!channel) return { ok: false };
    await this.channelsService.incrementMessages(String(channel._id));
    return { ok: true };
  }

  @Get('appointments/check-slot')
  @ApiOperation({ summary: '[n8n] Verificar disponibilidad de empleado en una franja horaria' })
  async checkSlot(
    @Query('tenantId') tenantId: string,
    @Query('employeeName') employeeName: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('excludeCalEventId') excludeCalEventId?: string,
  ) {
    if (!tenantId || !employeeName || !date || !time) {
      throw new BadRequestException('tenantId, employeeName, date y time son requeridos');
    }
    const query: any = {
      tenantId,
      employeeName,
      appointmentDate: date,
      appointmentTime: time,
      status: 'confirmed',
    };
    if (excludeCalEventId) query.calEventId = { $ne: excludeCalEventId };
    const conflict = await this.appointmentModel.findOne(query).lean();
    return {
      available: !conflict,
      conflictWith: conflict ? { clientName: (conflict as any).clientName, time: (conflict as any).appointmentTime } : null,
    };
  }
}
