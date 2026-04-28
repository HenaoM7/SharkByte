import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import {
  MercadoPagoConfig,
  PreApprovalPlan,
  PreApproval,
  Payment,
} from 'mercadopago';
import { Subscription } from './schemas/subscription.schema';
import { TenantsService } from '../tenants/tenants.service';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private mp: MercadoPagoConfig;

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    private tenantsService: TenantsService,
    private plansService: PlansService,
    private config: ConfigService,
  ) {
    const accessToken = this.config.get<string>('MP_ACCESS_TOKEN');
    if (accessToken) {
      this.mp = new MercadoPagoConfig({
        accessToken,
        options: { timeout: 10000 },
      });
      this.logger.log('MercadoPago configurado correctamente');
    } else {
      this.logger.warn('MP_ACCESS_TOKEN no configurado — billing desactivado');
    }
  }

  private requireMp(): void {
    if (!this.mp) {
      throw new ServiceUnavailableException(
        'MercadoPago no configurado. Define MP_ACCESS_TOKEN en las variables de entorno.',
      );
    }
  }

  /**
   * Obtiene o crea el PreApprovalPlan en MP para un plan SharkByte.
   * El ID se cachea en la coleccion plans para no recrearlo cada vez.
   */
  /**
   * Obtiene o crea el PreApprovalPlan en MP.
   * Retorna { mpPlanId, initPoint } — la URL de checkout del plan para redirigir al usuario.
   * MP no permite crear PreApprovals sin card_token, así que usamos el init_point del plan.
   */
  private async ensureMpPlan(planName: string): Promise<{ mpPlanId: string; initPoint: string }> {
    this.requireMp();
    const plan = await this.plansService.findByName(planName);

    if (plan.mpPlanId && (plan as any).mpInitPoint) {
      return { mpPlanId: plan.mpPlanId, initPoint: (plan as any).mpInitPoint };
    }

    const currency = this.config.get<string>('MP_CURRENCY') || 'COP';
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://sharkbyteia.com';
    const planLabel = planName.charAt(0).toUpperCase() + planName.slice(1);

    // Para plan anual: cobrar cada 12 meses. Para mensual: cada 1 mes.
    const isAnnual = plan.billingPeriod === 'annual';
    const frequency = isAnnual ? 12 : 1;

    let mpPlan: any;
    try {
      mpPlan = await new PreApprovalPlan(this.mp).create({
        body: {
          reason: `SharkByte ${planLabel}`,
          auto_recurring: {
            frequency,
            frequency_type: 'months',
            transaction_amount: plan.price,
            currency_id: currency,
          },
          back_url: `${frontendUrl}/tenants`,
        },
        requestOptions: {
          // Idempotency key: incluye precio para invalidar si cambian los valores
          idempotencyKey: `sb-plan-${planName}-${plan.price}`,
        },
      } as any);
    } catch (err: any) {
      const detail = err?.cause?.[0]?.description || err?.message || JSON.stringify(err);
      this.logger.error(`Error creando PreApprovalPlan en MP: ${detail}`, JSON.stringify(err));
      throw new Error(`MercadoPago PreApprovalPlan error: ${detail}`);
    }

    const mpPlanId = mpPlan.id!;
    const initPoint: string = mpPlan.init_point!;
    await this.plansService.updateMpPlanId(planName, mpPlanId, initPoint);
    this.logger.log(`PreApprovalPlan creado: ${mpPlanId} plan=${planName} url=${initPoint}`);
    return { mpPlanId, initPoint };
  }

  /**
   * Crea un PreApproval (checkout MP) para un tenant.
   * Retorna el init_point URL para redirigir al usuario.
   */
  async createCheckout(
    tenantId: string,
    planName: string,
    origin: string,
  ): Promise<{ url: string }> {
    if (!['pro', 'enterprise'].includes(planName)) {
      throw new BadRequestException(`Plan "${planName}" no es un plan de pago valido`);
    }

    this.requireMp();

    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);

    // Obtiene o crea el plan en MP. El init_point del plan es la URL de checkout.
    // MP no permite crear PreApprovals sin card_token, así que usamos el init_point del plan.
    const { mpPlanId, initPoint } = await this.ensureMpPlan(planName);

    // Registra la intención de suscripción en DB (estado 'pending').
    // El mpPreapprovalId se actualiza cuando MP envía el webhook de suscripción confirmada.
    await this.subscriptionModel.findOneAndUpdate(
      { tenantId },
      {
        tenantId,
        mpPreapprovalId: null,        // Se asigna cuando llega el webhook de MP
        mpPayerEmail: tenant.email,
        mpPlanId,
        planName,
        status: 'pending',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      { upsert: true, new: true },
    );

    this.logger.log(`Checkout MP: tenant=${tenantId} plan=${planName} url=${initPoint}`);
    return { url: initPoint };
  }

  async getSubscription(tenantId: string) {
    const sub = await this.subscriptionModel.findOne({ tenantId });
    if (!sub) return { tenantId, status: 'free', mpPreapprovalId: null };
    return sub;
  }

  async getInvoices(tenantId: string, limit = 10) {
    if (!this.mp) return [];
    const sub = await this.subscriptionModel.findOne({ tenantId });
    if (!sub?.mpPreapprovalId) return [];

    try {
      const result = await new Payment(this.mp).search({
        options: {
          filters: { preapproval_id: sub.mpPreapprovalId } as any,
          limit,
          offset: 0,
        },
      });

      return (result.results || []).map((p: any) => ({
        id: String(p.id),
        amount: p.transaction_amount || 0,
        currency: p.currency_id || 'COP',
        status: p.status === 'approved' ? 'paid' : p.status,
        date: p.date_created || p.date_approved || new Date().toISOString(),
        description: p.description || `Suscripcion SharkByte ${sub.planName || ''}`,
        pdfUrl: null,
      }));
    } catch (err) {
      this.logger.warn(`Error al obtener pagos MP: ${err.message}`);
      return [];
    }
  }

  async cancelSubscription(tenantId: string): Promise<void> {
    this.requireMp();
    const sub = await this.subscriptionModel.findOne({ tenantId });
    if (!sub?.mpPreapprovalId) {
      throw new NotFoundException(`No hay suscripcion activa para tenant ${tenantId}`);
    }

    await new PreApproval(this.mp).update({
      id: sub.mpPreapprovalId,
      body: { status: 'cancelled' } as any,
    });

    await this.subscriptionModel.findOneAndUpdate(
      { tenantId },
      { status: 'cancelled', canceledAt: new Date() },
    );

    await this.tenantsService.updatePlan(tenantId, 'free');
    this.logger.log(`Suscripcion cancelada: tenant=${tenantId}`);
  }

  async pauseSubscription(tenantId: string): Promise<void> {
    this.requireMp();
    const sub = await this.subscriptionModel.findOne({ tenantId });
    if (!sub?.mpPreapprovalId) {
      throw new NotFoundException(`No hay suscripcion activa para tenant ${tenantId}`);
    }

    await new PreApproval(this.mp).update({
      id: sub.mpPreapprovalId,
      body: { status: 'paused' } as any,
    });

    await this.subscriptionModel.findOneAndUpdate({ tenantId }, { status: 'paused' });
    this.logger.log(`Suscripcion pausada: tenant=${tenantId}`);
  }

  async resumeSubscription(tenantId: string): Promise<void> {
    this.requireMp();
    const sub = await this.subscriptionModel.findOne({ tenantId });
    if (!sub?.mpPreapprovalId) {
      throw new NotFoundException(`No hay suscripcion activa para tenant ${tenantId}`);
    }

    await new PreApproval(this.mp).update({
      id: sub.mpPreapprovalId,
      body: { status: 'authorized' } as any,
    });

    await this.subscriptionModel.findOneAndUpdate({ tenantId }, { status: 'authorized' });
    this.logger.log(`Suscripcion reanudada: tenant=${tenantId}`);
  }

  /**
   * Procesa webhooks de MercadoPago con verificacion de firma HMAC-SHA256.
   * Header x-signature: ts=1714258182,v1=hash
   */
  async handleWebhook(
    body: any,
    xSignature: string,
    xRequestId: string,
  ): Promise<void> {
    const webhookSecret = this.config.get<string>('MP_WEBHOOK_SECRET');

    if (webhookSecret && xSignature) {
      const parts: Record<string, string> = {};
      xSignature.split(',').forEach((part) => {
        const [k, v] = part.split('=');
        if (k && v) parts[k.trim()] = v.trim();
      });

      const ts = parts['ts'] || '';
      const v1 = parts['v1'] || '';
      const dataId = body?.data?.id ? String(body.data.id) : '';

      const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts}`;
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(manifest)
        .digest('hex');

      const expectedBuf = Buffer.from(expected, 'hex');
      const receivedBuf = Buffer.from(v1, 'hex');

      if (
        expectedBuf.length !== receivedBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, receivedBuf)
      ) {
        this.logger.error('Firma webhook MP invalida');
        throw new UnauthorizedException('Firma webhook MercadoPago invalida');
      }
    } else if (webhookSecret && !xSignature) {
      this.logger.error('Webhook MP recibido sin x-signature — rechazado');
      throw new UnauthorizedException('Firma webhook MercadoPago requerida');
    }

    const type = body?.type;
    const dataId = body?.data?.id ? String(body.data.id) : null;

    if (!dataId) {
      this.logger.debug(`Webhook MP sin data.id: type=${type}`);
      return;
    }

    if (type === 'subscription_preapproval') {
      await this.handlePreapprovalEvent(dataId);
    } else if (type === 'payment') {
      await this.handlePaymentEvent(dataId);
    } else {
      this.logger.debug(`Webhook MP ignorado: type=${type}`);
    }
  }

  private async handlePreapprovalEvent(preapprovalId: string): Promise<void> {
    if (!this.mp) return;
    try {
      const preapproval = await new PreApproval(this.mp).get({ id: preapprovalId });
      const status = preapproval.status as string;
      const payerEmail: string = (preapproval as any).payer_email || '';
      const planId: string = (preapproval as any).preapproval_plan_id || '';

      // Buscar suscripcion por mpPreapprovalId (si ya fue asignado) o por email del pagador
      let sub = await this.subscriptionModel.findOne({ mpPreapprovalId: preapprovalId });
      if (!sub && payerEmail) {
        sub = await this.subscriptionModel.findOne({ mpPayerEmail: payerEmail, status: 'pending' });
      }
      if (!sub) {
        this.logger.warn(`Preapproval ${preapprovalId} sin suscripcion en DB (email=${payerEmail})`);
        return;
      }

      const update: any = {
        status,
        mpPreapprovalId: preapprovalId,   // Asignar el ID real del preapproval
      };

      if ((preapproval as any).date_created) {
        update.currentPeriodStart = new Date((preapproval as any).date_created);
        const end = new Date(update.currentPeriodStart);
        const monthsToAdd = sub.planName === 'enterprise' ? 12 : 1;
        end.setMonth(end.getMonth() + monthsToAdd);
        update.currentPeriodEnd = end;
      }

      // Guardar el estado previo para determinar si es una nueva activación
      const wasAlreadyAuthorized = sub.status === 'authorized';

      if (status === 'authorized') {
        const planName = sub.planName || 'enterprise';
        // updatePlan upserta la suscripción con fechas aproximadas (Date.now).
        // La actualización con fechas exactas de MP se aplica después para preservarlas.
        await this.tenantsService.updatePlan(sub.tenantId, planName);
        await this.tenantsService.updateStatus(sub.tenantId, 'active');
        this.logger.log(`Suscripcion autorizada: tenant=${sub.tenantId} plan=${planName} → activado`);
      }

      // Aplicar las fechas exactas de MP (sobrescribe las aproximadas de updatePlan)
      const updatedSub = await this.subscriptionModel.findOneAndUpdate(
        { tenantId: sub.tenantId },
        update,
        { new: true },
      );

      if (status === 'authorized' && !wasAlreadyAuthorized) {
        // Solo enviar factura en la activación inicial, no en re-entregas del webhook
        try {
          const tenant = await this.tenantsService.findById(sub.tenantId);
          await this.sendInvoiceEmail(tenant, updatedSub || sub);
        } catch (e) {
          this.logger.warn(`Invoice email error (webhook): ${e.message}`);
        }
      } else if (status === 'cancelled') {
        await this.tenantsService.updatePlan(sub.tenantId, 'free');
        await this.subscriptionModel.findOneAndUpdate(
          { mpPreapprovalId: preapprovalId },
          { canceledAt: new Date() },
        );
        this.logger.log(`Suscripcion cancelada via webhook: tenant=${sub.tenantId}`);
      } else {
        this.logger.log(`Preapproval ${preapprovalId} status=${status}`);
      }
    } catch (err) {
      this.logger.error(`Error procesando preapproval ${preapprovalId}: ${err.message}`);
      throw err; // Re-throw → respuesta 5xx → MP reintenta el webhook
    }
  }

  private async handlePaymentEvent(paymentId: string): Promise<void> {
    if (!this.mp) return;
    try {
      const payment = await new Payment(this.mp).get({ id: Number(paymentId) });
      const status = (payment as any).status;
      this.logger.log(`Pago MP: id=${paymentId} status=${status}`);
    } catch (err) {
      this.logger.warn(`Error obteniendo pago ${paymentId}: ${err.message}`);
      throw err; // Re-throw → MP reintenta
    }
  }

  /** Activación manual de plan por admin (sin MercadoPago) */
  async manualActivate(tenantId: string, planName: string): Promise<{ ok: boolean; message: string }> {
    if (!['pro', 'enterprise'].includes(planName)) {
      throw new BadRequestException(`Plan "${planName}" no válido`);
    }

    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);

    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + (planName === 'enterprise' ? 12 : 1));

    const sub = await this.subscriptionModel.findOneAndUpdate(
      { tenantId },
      {
        tenantId,
        status: 'authorized',
        planName,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      { upsert: true, new: true },
    );

    await this.tenantsService.updatePlan(tenantId, planName);
    await this.tenantsService.updateStatus(tenantId, 'active');
    this.logger.log(`[ManualActivate] tenant=${tenantId} plan=${planName} → activado`);

    try {
      await this.sendInvoiceEmail(tenant, sub);
    } catch (e) {
      this.logger.warn(`Invoice email error (manualActivate): ${e.message}`);
    }

    return { ok: true, message: `Plan ${planName} activado. Se envió factura a ${tenant.email}.` };
  }

  /** Envía factura HTML por email al tenant */
  private async sendInvoiceEmail(tenant: any, sub: any): Promise<void> {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (!smtpHost || !tenant.email) return;

    const planLabels: Record<string, string> = { pro: 'Plan Mensual', enterprise: 'Plan Anual' };
    const planAmounts: Record<string, number> = { pro: 999998, enterprise: 9999998 };
    const planLabel = planLabels[sub.planName] || sub.planName;
    const amount = planAmounts[sub.planName] || 0;
    const invoiceNumber = `SB-${Date.now()}`;
    const periodStart = sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString('es-CO') : '';
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('es-CO') : '';
    const businessName = tenant.name || 'Negocio';

    const subject = `Factura ${invoiceNumber} — SharkByte ${planLabel}`;
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #0f172a; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">SharkByte</h1>
    <p style="margin: 4px 0 0; opacity: 0.6; font-size: 13px;">Plataforma SaaS de automatización empresarial</p>
  </div>
  <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <h2 style="margin: 0 0 20px; font-size: 18px; color: #1e293b;">Factura de Suscripción</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
      <tr><td style="padding: 8px 0; color: #64748b; width: 40%;">Número de factura</td><td style="padding: 8px 0; font-weight: 600; color: #111;">${invoiceNumber}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Cliente</td><td style="padding: 8px 0; color: #111;">${businessName}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0; color: #111;">${tenant.email}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Plan</td><td style="padding: 8px 0; color: #111;">${planLabel}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">Período</td><td style="padding: 8px 0; color: #111;">${periodStart} — ${periodEnd}</td></tr>
    </table>
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; color: #374151;">${planLabel} — SharkByte</span>
        <span style="font-size: 18px; font-weight: 700; color: #153959;">${amount.toLocaleString('es-CO')} COP</span>
      </div>
    </div>
    <div style="background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 12px; text-align: center;">
      <span style="color: #065f46; font-weight: 600; font-size: 14px;">✓ Pago confirmado — Suscripción activa</span>
    </div>
    <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center;">
      Este documento es una factura electrónica generada automáticamente por <strong>SharkByte</strong>.
    </p>
  </div>
</div>`;

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
    await transporter.sendMail({ from, to: tenant.email, subject, html });
    this.logger.log(`[Invoice] Email enviado a ${tenant.email} — ${invoiceNumber}`);
  }
}
