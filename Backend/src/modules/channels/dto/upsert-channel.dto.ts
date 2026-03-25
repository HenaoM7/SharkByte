import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertChannelDto {
  @ApiProperty({ enum: ['facebook', 'instagram', 'telegram', 'tiktok'] })
  @IsIn(['facebook', 'instagram', 'telegram', 'tiktok'])
  platform: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Mi Página de Facebook' })
  @IsOptional() @IsString() @MaxLength(150)
  displayName?: string;

  // ── Meta ──────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: '123456789012345' })
  @IsOptional() @IsString() @MaxLength(50)
  pageId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  instagramAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(600)
  accessToken?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  appSecret?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  webhookVerifyToken?: string;

  // ── Telegram ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: '123456789:ABCdef...' })
  @IsOptional() @IsString() @MaxLength(200)
  botToken?: string;

  @ApiPropertyOptional({ example: '@MiTiendaBot' })
  @IsOptional() @IsString() @MaxLength(100)
  botUsername?: string;

  // ── TikTok ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(600)
  tiktokAccessToken?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  tiktokAccountId?: string;

  // ── n8n ───────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'http://localhost:5678/webhook/telegram-handler' })
  @IsOptional() @IsString() @MaxLength(500)
  n8nWebhookUrl?: string;
}
