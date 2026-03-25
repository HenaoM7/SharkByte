import { IsOptional, IsString, IsBoolean, IsEmail, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGoogleCredentialsDto {
  @ApiPropertyOptional({ description: 'Activar integración Google Sheets + Calendar' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'mi-sa@mi-proyecto.iam.gserviceaccount.com' })
  @IsOptional()
  @IsEmail({}, { message: 'clientEmail debe ser un email de Service Account válido' })
  clientEmail?: string;

  @ApiPropertyOptional({ description: 'Clave privada PEM del Service Account' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  privateKey?: string;

  @ApiPropertyOptional({ description: 'ID del Google Spreadsheet (de la URL)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  spreadsheetId?: string;

  @ApiPropertyOptional({ description: 'Nombre de la pestaña dentro del spreadsheet', default: 'Citas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sheetName?: string;

  @ApiPropertyOptional({ description: 'ID del calendario Google. "primary" para el principal', default: 'primary' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  calendarId?: string;
}
