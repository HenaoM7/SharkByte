import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../tenants/tenants.schema';
import { Plan } from '../plans/plans.schema';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
  ) {}

  async recordUsage(tenantId: string, messages: number, tokens: number): Promise<void> {
    await this.tenantModel.updateOne(
      { tenantId },
      { $inc: { messagesUsed: messages, tokensUsed: tokens } },
    );
  }

  async getUsage(tenantId: string) {
    const tenant = await this.tenantModel
      .findOne({ tenantId })
      .populate('plan', '-__v');

    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);

    const plan = tenant.plan as unknown as Plan;

    return {
      tenantId,
      plan: plan.name,
      messagesUsed: tenant.messagesUsed,
      tokensUsed: tenant.tokensUsed,
      limits: {
        maxMessages: plan.maxMessages,
        maxTokens: plan.maxTokens,
      },
      resetAt: tenant.usageResetAt,
    };
  }

  // Verifica si el tenant puede procesar mensajes. Retorna detalle del bloqueo si aplica.
  async canProcessDetailed(tenantId: string): Promise<{ ok: boolean; reason?: string }> {
    const tenant = await this.tenantModel
      .findOne({ tenantId })
      .populate('plan', 'maxMessages maxTokens');

    if (!tenant) return { ok: false, reason: 'tenant_not_found' };
    if (!tenant.isActive) return { ok: false, reason: 'tenant_inactive' };

    // Credenciales válidas si tiene apiUrl+apiKey propios, O si tiene instanceName (usa servidor global SharkByte)
    const hasCredentials = !!(
      (tenant.evolutionInstance?.apiUrl?.trim() && tenant.evolutionInstance?.apiKey?.trim()) ||
      tenant.evolutionInstance?.instanceName?.trim()
    );
    if (!hasCredentials) return { ok: false, reason: 'no_evolution_credentials' };

    const plan = tenant.plan as unknown as Plan;
    const messagesOk = plan.maxMessages === -1 || tenant.messagesUsed < plan.maxMessages;
    const tokensOk = plan.maxTokens === -1 || tenant.tokensUsed < plan.maxTokens;

    if (!messagesOk) return { ok: false, reason: 'messages_limit_reached' };
    if (!tokensOk) return { ok: false, reason: 'tokens_limit_reached' };

    return { ok: true };
  }

  // Verifica si el tenant puede procesar más mensajes según su plan
  async canProcess(tenantId: string): Promise<boolean> {
    const result = await this.canProcessDetailed(tenantId);
    return result.ok;
  }

  // Llamado por el scheduler el día 1 de cada mes
  async resetAllMonthly(): Promise<void> {
    const now = new Date();
    await this.tenantModel.updateMany(
      {},
      {
        $set: {
          messagesUsed: 0,
          tokensUsed: 0,
          usageResetAt: now,
        },
      },
    );
    this.logger.log(`Reset mensual ejecutado — ${now.toISOString()}`);
  }
}
