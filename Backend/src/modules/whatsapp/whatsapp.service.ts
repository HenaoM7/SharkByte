import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant } from '../tenants/tenants.schema';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private config: ConfigService,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
  ) {}

  private getEvolutionConfig(tenant: Tenant): { apiUrl: string; apiKey: string } {
    const rawUrl =
      tenant.evolutionInstance?.apiUrl?.trim() ||
      this.config.get<string>('EVOLUTION_API_URL') ||
      'http://localhost:8080';
    const apiKey =
      tenant.evolutionInstance?.apiKey?.trim() ||
      this.config.get<string>('EVOLUTION_API_KEY') ||
      'superapikey';
    // In dev mode, backend runs on the host — normalize Docker-internal hostnames to localhost
    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    const apiUrl = isDev ? rawUrl.replace('eco_evolution', 'localhost') : rawUrl;
    return { apiUrl, apiKey };
  }

  private async fetchEvolution(url: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(url, options);
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Evolution API v2 nests the real message under data.response.message (array or string)
      const nested = data?.response?.message;
      const nestedMsg = Array.isArray(nested) ? nested[0] : nested;
      const msg: string = data?.message || nestedMsg || data?.error || `Evolution API error ${res.status}`;
      throw new BadRequestException(msg);
    }
    return data;
  }

  private async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findOne({ tenantId, deletedAt: null });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return tenant;
  }

  private async setWebhook(instanceName: string, apiUrl: string, apiKey: string): Promise<void> {
    const webhookUrl =
      this.config.get<string>('N8N_WEBHOOK_URL') ||
      'http://eco_n8n:5678/webhook/whatsapp-inbound';
    try {
      await this.fetchEvolution(`${apiUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            enabled: true,
            events: ['MESSAGES_UPSERT'],
            webhookByEvents: false,
            webhookBase64: false,
          },
        }),
      });
      this.logger.log(`Webhook configurado: ${instanceName} → ${webhookUrl}`);
    } catch (err: any) {
      this.logger.warn(`No se pudo configurar webhook para '${instanceName}': ${err?.message}`);
    }
  }

  async connect(tenantId: string): Promise<{ qr?: string; status: string; instanceName: string }> {
    const tenant = await this.getTenant(tenantId);
    const { apiUrl, apiKey } = this.getEvolutionConfig(tenant);
    const instanceName = tenant.evolutionInstance?.instanceName?.trim() || `sb-${tenantId}`;

    try {
      const result = await this.fetchEvolution(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
      });

      await this.tenantModel.updateOne(
        { tenantId },
        { $set: { 'evolutionInstance.instanceName': instanceName, 'evolutionInstance.status': 'pending' } },
      );

      await this.setWebhook(instanceName, apiUrl, apiKey);

      const qr = result?.qrcode?.base64 as string | undefined;
      return { qr, status: 'pending', instanceName };

    } catch (err: any) {
      // Instance already exists — fetch QR from existing instance
      const msg: string = (err?.message ?? '').toLowerCase();
      if (msg.includes('already') || msg.includes('exists') || msg.includes('já existe')) {
        // Ensure instanceName is saved
        await this.tenantModel.updateOne(
          { tenantId },
          { $set: { 'evolutionInstance.instanceName': instanceName } },
        );
        await this.setWebhook(instanceName, apiUrl, apiKey);
        return this.getQR(tenantId, instanceName, apiUrl, apiKey);
      }
      throw err;
    }
  }

  async getQR(
    tenantId: string,
    instanceNameOverride?: string,
    apiUrlOverride?: string,
    apiKeyOverride?: string,
  ): Promise<{ qr?: string; status: string; instanceName: string }> {
    const tenant = await this.getTenant(tenantId);
    const { apiUrl, apiKey } = this.getEvolutionConfig(tenant);

    const instanceName = instanceNameOverride || tenant.evolutionInstance?.instanceName?.trim();
    if (!instanceName) throw new BadRequestException('Instancia no creada. Usa /connect primero.');

    const resolvedUrl = apiUrlOverride || apiUrl;
    const resolvedKey = apiKeyOverride || apiKey;

    const result = await this.fetchEvolution(`${resolvedUrl}/instance/connect/${instanceName}`, {
      headers: { apikey: resolvedKey },
    });

    // If already connected, Evolution returns { instance: { state: 'open' } }
    const state = result?.instance?.state as string | undefined;
    if (state === 'open') {
      await this.tenantModel.updateOne(
        { tenantId },
        { $set: { 'evolutionInstance.status': 'connected' } },
      );
      return { status: 'open', instanceName };
    }

    // QR response: { base64: "data:image/png;base64,...", code: "..." }
    const qr = result?.base64 as string | undefined;
    return { qr, status: 'pending', instanceName };
  }

  async getStatus(tenantId: string): Promise<{ status: string; instanceName: string; phone?: string }> {
    const tenant = await this.getTenant(tenantId);
    const instanceName = tenant.evolutionInstance?.instanceName?.trim();

    if (!instanceName) return { status: 'not_created', instanceName: '' };

    const { apiUrl, apiKey } = this.getEvolutionConfig(tenant);

    try {
      const result = await this.fetchEvolution(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey },
      });

      const rawState = result?.instance?.state as string;
      // Normalizar estados de Evolution API → estados internos
      // 'close' = desconectado, 'open' = conectado, resto = en progreso
      const state = rawState === 'close' ? 'disconnected' : rawState;

      if (rawState === 'open') {
        await this.tenantModel.updateOne(
          { tenantId },
          { $set: { 'evolutionInstance.status': 'connected' } },
        );
      } else if (rawState && rawState !== 'open') {
        await this.tenantModel.updateOne(
          { tenantId },
          { $set: { 'evolutionInstance.status': 'disconnected' } },
        );
      }

      return {
        status: state ?? 'unknown',
        instanceName,
        phone: tenant.evolutionInstance?.phoneConnected,
      };
    } catch {
      return { status: 'error', instanceName };
    }
  }

  async disconnect(tenantId: string): Promise<{ success: boolean }> {
    const tenant = await this.getTenant(tenantId);
    const instanceName = tenant.evolutionInstance?.instanceName?.trim();
    if (!instanceName) throw new BadRequestException('No hay instancia activa.');

    const { apiUrl, apiKey } = this.getEvolutionConfig(tenant);

    try {
      await this.fetchEvolution(`${apiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: apiKey },
      });
    } catch (err: any) {
      this.logger.warn(`Logout warning for ${instanceName}: ${err?.message}`);
    }

    await this.tenantModel.updateOne(
      { tenantId },
      { $set: { 'evolutionInstance.status': 'disconnected' } },
    );
    return { success: true };
  }

  async deleteInstance(tenantId: string): Promise<{ success: boolean }> {
    const tenant = await this.getTenant(tenantId);
    const instanceName = tenant.evolutionInstance?.instanceName?.trim();
    if (!instanceName) throw new BadRequestException('No hay instancia para eliminar.');

    const { apiUrl, apiKey } = this.getEvolutionConfig(tenant);

    try {
      await this.fetchEvolution(`${apiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: apiKey },
      });
    } catch (err: any) {
      this.logger.warn(`Delete instance warning for ${instanceName}: ${err?.message}`);
    }

    await this.tenantModel.updateOne(
      { tenantId },
      { $set: { 'evolutionInstance.instanceName': '', 'evolutionInstance.status': 'disconnected' } },
    );
    return { success: true };
  }
}
