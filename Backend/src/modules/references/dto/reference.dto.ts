import { IsString, IsOptional, IsBoolean, IsArray, IsIn, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferenceDto {
  @ApiProperty({ example: 'Tienda web principal' })
  @IsString() @MaxLength(150)
  name: string;

  @ApiProperty({ enum: ['web', 'api', 'document'] })
  @IsIn(['web', 'api', 'document'])
  type: string;

  @ApiProperty({ example: 'https://mitienda.com/productos' })
  @IsString() @MaxLength(2000)
  url: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ['manual', 'hourly', 'daily', 'weekly'] })
  @IsOptional() @IsIn(['manual', 'hourly', 'daily', 'weekly'])
  updateFrequency?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsArray()
  categories?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateReferenceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150)  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['web', 'api', 'document'])  type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['manual', 'hourly', 'daily', 'weekly']) updateFrequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray()   categories?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional()              lastFetched?: Date;
}
