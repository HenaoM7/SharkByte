import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'channel_configs' })
export class ChannelConfig extends Document {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, enum: ['facebook', 'instagram', 'telegram', 'tiktok'] })
  platform: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: '' })
  displayName: string; // e.g. "Mi Página de Facebook"

  // ── Meta (Facebook + Instagram) ──────────────────────────────────────────
  @Prop({ default: '' })
  pageId: string; // Facebook Page ID

  @Prop({ default: '' })
  instagramAccountId: string; // Instagram Business Account ID

  @Prop({ default: '' })
  accessToken: string; // Page Access Token (long-lived)

  @Prop({ default: '' })
  appSecret: string; // Meta App Secret for HMAC signature verification

  @Prop({ default: '' })
  webhookVerifyToken: string; // Token used during Meta webhook subscription challenge

  // ── Telegram ─────────────────────────────────────────────────────────────
  @Prop({ default: '' })
  botToken: string; // e.g. 123456:ABC-DEF...

  @Prop({ default: '' })
  botUsername: string; // e.g. @MiTiendaBot

  // ── TikTok ───────────────────────────────────────────────────────────────
  @Prop({ default: '' })
  tiktokAccessToken: string;

  @Prop({ default: '' })
  tiktokAccountId: string; // TikTok open_id del negocio

  // ── n8n ──────────────────────────────────────────────────────────────────
  @Prop({ default: '' })
  n8nWebhookUrl: string; // URL completa del webhook n8n para este canal

  // ── Estadísticas ─────────────────────────────────────────────────────────
  @Prop({ default: 0 })
  messagesProcessed: number;

  @Prop({ type: Date, default: null })
  lastActive: Date | null;
}

export const ChannelConfigSchema = SchemaFactory.createForClass(ChannelConfig);
ChannelConfigSchema.index({ tenantId: 1, platform: 1 }, { unique: true });
