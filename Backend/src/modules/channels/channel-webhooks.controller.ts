import {
  Controller, Get, Post, Param, Body, Query, Headers,
  HttpCode, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ChannelsService } from './channels.service';

// Webhook endpoints reciben eventos de Meta, Telegram y TikTok.
// NO usan JwtAuthGuard — son endpoints públicos con validación propia.
// Producción: Nginx debe permitir estos paths desde internet.
@ApiTags('Webhooks')
@SkipThrottle() // Meta/Telegram envían muchos eventos; no limitar por rate
@Controller('webhooks')
export class ChannelWebhooksController {
  private readonly logger = new Logger(ChannelWebhooksController.name);

  constructor(private readonly channelsService: ChannelsService) {}

  // ── META (Facebook + Instagram) ────────────────────────────────────────────

  // Meta llama a este endpoint GET durante la configuración del webhook
  // para verificar que la URL es válida. Responder con hub.challenge.
  @Get('meta')
  @ApiOperation({ summary: 'Meta webhook verification challenge (GET)' })
  verifyMeta(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && challenge) {
      // Respondemos con hub.challenge como número o string
      const num = parseInt(challenge, 10);
      return isNaN(num) ? challenge : num;
    }
    return 'ok';
  }

  // Meta envía eventos de mensajes vía POST.
  // El campo `object` indica si es "page" (Facebook) o "instagram".
  @Post('meta')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recibir eventos de Facebook Messenger e Instagram DMs' })
  async handleMeta(@Body() body: any) {
    const object = body?.object;
    for (const entry of (body?.entry ?? [])) {
      if (object === 'page') {
        await this.handleFacebookEntry(entry);
      } else if (object === 'instagram') {
        await this.handleInstagramEntry(entry);
      }
    }
    return { status: 'ok' };
  }

  private async handleFacebookEntry(entry: any) {
    const pageId = String(entry?.id ?? '');
    if (!pageId) return;

    const channel = await this.channelsService.findByPageId(pageId);
    if (!channel) {
      this.logger.warn(`[FB] No channel config found for pageId: ${pageId}`);
      return;
    }

    for (const messaging of (entry.messaging ?? [])) {
      // Ignorar mensajes propios (echo) y eventos sin texto
      if (!messaging.message || messaging.message.is_echo) continue;
      const text: string = messaging.message.text ?? '';
      if (!text.trim()) continue;

      await this.forwardToN8n(channel, {
        platform: 'facebook',
        tenantId: channel.tenantId,
        senderId: String(messaging.sender?.id ?? ''),
        senderName: '',
        messageId: String(messaging.message?.mid ?? ''),
        messageText: text,
        messageType: 'text',
        timestamp: messaging.timestamp ?? Date.now(),
        pageId,
      });
    }
  }

  private async handleInstagramEntry(entry: any) {
    const igAccountId = String(entry?.id ?? '');
    if (!igAccountId) return;

    const channel = await this.channelsService.findByInstagramAccountId(igAccountId);
    if (!channel) {
      this.logger.warn(`[IG] No channel config found for instagramAccountId: ${igAccountId}`);
      return;
    }

    for (const messaging of (entry.messaging ?? [])) {
      if (!messaging.message || messaging.message.is_echo) continue;
      const text: string = messaging.message.text ?? '';
      if (!text.trim()) continue;

      await this.forwardToN8n(channel, {
        platform: 'instagram',
        tenantId: channel.tenantId,
        senderId: String(messaging.sender?.id ?? ''),
        senderName: '',
        messageId: String(messaging.message?.mid ?? ''),
        messageText: text,
        messageType: 'text',
        timestamp: messaging.timestamp ?? Date.now(),
        instagramAccountId: igAccountId,
      });
    }
  }

  // ── TELEGRAM ─────────────────────────────────────────────────────────────────
  // Telegram envía el webhook al path que incluye el botToken.
  // El botToken en la URL actúa como secreto de autenticación.
  @Post('telegram/:botToken')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recibir mensajes de Telegram Bot' })
  async handleTelegram(
    @Param('botToken') botToken: string,
    @Body() body: any,
  ) {
    const channel = await this.channelsService.findByBotToken(botToken);
    if (!channel) return { ok: true };

    const message = body?.message ?? body?.edited_message;
    const text: string = message?.text ?? '';
    if (!text.trim()) return { ok: true };

    await this.forwardToN8n(channel, {
      platform: 'telegram',
      tenantId: channel.tenantId,
      senderId: String(message.from?.id ?? ''),
      senderName: [message.from?.first_name, message.from?.last_name]
        .filter(Boolean).join(' '),
      messageId: String(message.message_id ?? ''),
      messageText: text,
      messageType: 'text',
      timestamp: (message.date ?? 0) * 1000,
      chatId: String(message.chat?.id ?? ''),
      botToken,
    });

    return { ok: true };
  }

  // ── TIKTOK ───────────────────────────────────────────────────────────────────
  // TikTok Business Messaging API — webhook para DMs del negocio.
  // GET: verificación del webhook (eco del challenge).
  @Get('tiktok')
  @ApiOperation({ summary: 'TikTok webhook verification (GET)' })
  verifyTikTok(@Query('challenge') challenge: string) {
    return challenge ?? 'ok';
  }

  @Post('tiktok')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recibir eventos TikTok Direct Messages' })
  async handleTikTok(@Body() body: any) {
    if (body?.type !== 'direct_message') return { status: 'ok' };

    const msg = body?.event?.message;
    // Recipient can be in event.message.to_user.open_id or body.business_id
    const tiktokAccountId = String(
      msg?.to_user?.open_id ?? body?.business_id ?? '',
    );
    if (!tiktokAccountId) return { status: 'ok' };

    const channel = await this.channelsService.findByTiktokAccountId(tiktokAccountId);
    if (!channel) return { status: 'ok' };

    // Content is a JSON string: {"text": "..."}
    let text = '';
    try {
      const contentObj = JSON.parse(msg?.content ?? '{}');
      text = contentObj.text ?? '';
    } catch {
      text = msg?.content ?? '';
    }
    if (!text.trim()) return { status: 'ok' };

    await this.forwardToN8n(channel, {
      platform: 'tiktok',
      tenantId: channel.tenantId,
      senderId: String(msg?.from_user?.open_id ?? ''),
      senderName: String(msg?.from_user?.display_name ?? ''),
      messageId: String(msg?.message_id ?? ''),
      messageText: text,
      messageType: msg?.message_type ?? 'text',
      timestamp: (msg?.create_time ?? Date.now()),
      tiktokAccountId,
    });

    return { status: 'ok' };
  }

  // ── HELPER ────────────────────────────────────────────────────────────────────

  private async forwardToN8n(channel: any, payload: any) {
    if (!channel.n8nWebhookUrl) {
      this.logger.warn(
        `[${channel.platform?.toUpperCase()}] n8nWebhookUrl no configurado para tenant ${channel.tenantId}`,
      );
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);

      const res = await fetch(channel.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        this.logger.warn(
          `[${channel.platform?.toUpperCase()}] n8n respondió ${res.status} para tenant ${channel.tenantId}`,
        );
      }

      await this.channelsService.incrementMessages(String(channel._id));
    } catch (err) {
      this.logger.error(
        `[${channel.platform?.toUpperCase()}] Error forwarding to n8n for tenant ${channel.tenantId}: ${err.message}`,
      );
    }
  }
}
