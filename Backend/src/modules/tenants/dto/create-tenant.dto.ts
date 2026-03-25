import { IsEmail, IsString, IsOptional, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Restaurante El Buen Sabor' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+573001112233' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'owner@negocio.com' })
  @IsEmail()
  email: string;

  // Acepta el nombre del plan (más amigable que ObjectId en la API)
  // El service hace el lookup interno
  @ApiPropertyOptional({ example: 'free', enum: ['free', 'pro', 'enterprise'] })
  @IsOptional()
  @IsIn(['free', 'pro', 'enterprise'])
  planName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
