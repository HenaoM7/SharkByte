import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class UpsertConversationDto {
  @IsString() tenantId: string;
  @IsString() @MaxLength(100) contactPhone: string; // phone for WhatsApp; senderId/chatId for other channels
  @IsOptional() @IsString() @MaxLength(100) contactName?: string;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
  @IsOptional() @IsIn(['client', 'bot', 'agent']) sender?: string;
  @IsOptional() @IsIn(['text', 'image', 'audio', 'document']) type?: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsIn(['whatsapp', 'facebook', 'instagram', 'telegram', 'tiktok']) platform?: string;
}
