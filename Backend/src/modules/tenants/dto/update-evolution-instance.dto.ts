import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEvolutionInstanceDto {
  @ApiPropertyOptional({ example: 'mi-empresa-whatsapp' })
  @IsOptional()
  @IsString()
  instanceName?: string;

  @ApiPropertyOptional({ enum: ['connected', 'disconnected', 'pending'], example: 'connected' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'https://evolution.miservidor.com' })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'apiUrl debe ser una URL válida (ej: https://evolution.miservidor.com)' })
  apiUrl?: string;

  @ApiPropertyOptional({ description: 'API Key del servidor Evolution. Dejar vacío para no modificar.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  apiKey?: string;
}
