import { IsString, IsNotEmpty, IsBoolean, IsNumber, IsOptional, IsObject, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class TriggerDto {
  @IsIn(['keyword', 'intent', 'schedule', 'usage_limit', 'inactivity'])
  type: string;

  @IsOptional()
  keywords?: string[];

  @IsOptional()
  matchMode?: string;

  @IsOptional()
  @IsString()
  intent?: string;

  @IsOptional()
  schedule?: { days: string[]; time: string };

  @IsOptional()
  @IsNumber()
  usagePercent?: number;

  @IsOptional()
  @IsNumber()
  inactivityDays?: number;
}

class ActionDto {
  @IsIn(['auto_reply', 'notify_admin', 'tag', 'escalate', 'webhook'])
  type: string;

  @IsOptional()
  @IsString()
  replyMessage?: string;

  @IsOptional()
  @IsString()
  notifyEmail?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsObject()
  webhookPayload?: Record<string, any>;
}

export class CreateRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => TriggerDto)
  trigger: TriggerDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ActionDto)
  action: ActionDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priority?: number;
}
