import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChannelConfig } from './schemas/channel-config.schema';
import { UpsertChannelDto } from './dto/upsert-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(ChannelConfig.name) private model: Model<ChannelConfig>,
  ) {}

  async findByTenantId(tenantId: string): Promise<any[]> {
    return this.model.find({ tenantId }).lean();
  }

  async findByTenantAndPlatform(tenantId: string, platform: string): Promise<any> {
    return this.model.findOne({ tenantId, platform }).lean();
  }

  async findByPageId(pageId: string): Promise<any> {
    return this.model.findOne({ pageId, platform: 'facebook', isActive: true }).lean();
  }

  async findByInstagramAccountId(instagramAccountId: string): Promise<any> {
    return this.model.findOne({ instagramAccountId, platform: 'instagram', isActive: true }).lean();
  }

  async findByBotToken(botToken: string): Promise<any> {
    return this.model.findOne({ botToken, platform: 'telegram', isActive: true }).lean();
  }

  async findByTiktokAccountId(tiktokAccountId: string): Promise<any> {
    return this.model.findOne({ tiktokAccountId, platform: 'tiktok', isActive: true }).lean();
  }

  async findActiveByTenantId(tenantId: string): Promise<any[]> {
    return this.model.find({ tenantId, isActive: true }).lean();
  }

  async upsert(tenantId: string, dto: UpsertChannelDto): Promise<any> {
    const { platform, ...rest } = dto;
    const doc = await this.model.findOneAndUpdate(
      { tenantId, platform },
      { $set: { ...rest, tenantId, platform } },
      { upsert: true, new: true },
    ).lean();

    // Auto-register Telegram webhook when botToken is saved
    if (platform === 'telegram' && dto.botToken) {
      try {
        const apiBase = process.env.PUBLIC_API_URL ?? 'https://api.sharkbyteia.com';
        const webhookUrl = `${apiBase}/webhooks/telegram/${encodeURIComponent(dto.botToken)}`;
        const tgUrl = `https://api.telegram.org/bot${dto.botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
        const res = await fetch(tgUrl, { method: 'POST' });
        const json = (await res.json()) as { ok: boolean; description?: string };
        if (!json.ok) {
          console.warn(`[Channels] Telegram setWebhook failed: ${json.description}`);
        }
      } catch (e) {
        console.warn('[Channels] Telegram setWebhook error:', e);
      }
    }

    return doc;
  }

  async remove(tenantId: string, platform: string): Promise<{ deleted: boolean }> {
    const result = await this.model.deleteOne({ tenantId, platform });
    return { deleted: result.deletedCount > 0 };
  }

  async testMetaToken(accessToken: string): Promise<{
    ok: boolean; pageName?: string; pageId?: string;
    instagramId?: string; error?: string; diagnosis?: string;
  }> {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`,
      );
      const json = (await res.json()) as any;
      if (json.error) {
        const code = json.error.code;
        let diagnosis = 'Verifica que el token sea correcto.';
        if (code === 190) diagnosis = 'Token expirado — genera uno nuevo en Meta Developers.';
        else if (code === 10)  diagnosis = 'Permisos insuficientes — revisa los permisos de la app.';
        else if (code === 200) diagnosis = 'La app no tiene acceso a esta Página.';
        return { ok: false, error: json.error.message, diagnosis };
      }
      const page = json.data?.[0];
      if (!page) return { ok: false, error: 'No se encontraron páginas vinculadas.', diagnosis: 'Asegúrate de seleccionar la Página correcta al generar el token.' };
      return {
        ok: true,
        pageName: page.name,
        pageId: page.id,
        instagramId: page.instagram_business_account?.id,
      };
    } catch {
      return { ok: false, error: 'No se pudo conectar con Meta.', diagnosis: 'Verifica tu conexión a internet e intenta de nuevo.' };
    }
  }

  async incrementMessages(id: string): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      { $inc: { messagesProcessed: 1 }, $set: { lastActive: new Date() } },
    );
  }
}
