import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Mi Restaurante SAS' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName: string;

  @ApiProperty({ example: '+573001234567' })
  @IsString()
  @MaxLength(30)
  @Matches(/^\+/, { message: 'El teléfono debe comenzar con + (formato internacional)' })
  phone: string;

  @ApiProperty({ example: 'negocio@empresa.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'contraseña_segura', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  // ── Campos opcionales para pre-popular la configuración del negocio ──────────

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) businessType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) businessTypeCustom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)  teamSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)  currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)  timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)  language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) agentName?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray()                  paymentMethods?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean()                autoReply?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()                salesAutomation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()                agendaAutomation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()                followUpAutomation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean()                escalation?: boolean;
}
