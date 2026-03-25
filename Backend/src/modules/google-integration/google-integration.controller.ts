import {
  Controller, Get, Post, Delete, Patch, Param, Query, Body, Res,
  UseGuards, HttpCode, BadRequestException, Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { GoogleIntegrationService } from './google-integration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { InternalKeyGuard } from '../internal/guards/internal-key.guard';

class UpdateGoogleConfigDto {
  @IsOptional() @IsString() calendarId?: string;
  @IsOptional() @IsString() spreadsheetId?: string;
}

class CreateCalendarEventDto {
  @IsString() tenantId: string;
  @IsString() summary: string;
  @IsOptional() @IsString() description?: string;
  @IsString() startDateTime: string;
  @IsString() endDateTime: string;
  @IsOptional() @IsString() attendeeEmail?: string;
  @IsOptional() @IsString() timeZone?: string;
}

class UpdateCalendarEventDto {
  @IsString() tenantId: string;
  @IsString() eventId: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() startDateTime?: string;
  @IsOptional() @IsString() endDateTime?: string;
  @IsOptional() @IsString() timeZone?: string;
  @IsOptional() @IsString() status?: string;
}

class DeleteCalendarEventDto {
  @IsString() tenantId: string;
  @IsString() eventId: string;
}

class AppendSheetRowDto {
  @IsString() tenantId: string;
  @IsString() fecha: string;
  @IsString() hora: string;
  @IsString() nombre: string;
  @IsString() telefono: string;
  @IsString() servicio: string;
  @IsString() estado: string;
  @IsOptional() @IsString() empleado?: string;
  @IsOptional() @IsString() eventoCalendarId?: string;
  @IsOptional() @IsString() fechaCreacion?: string;
}

class UpdateSheetRowDto {
  @IsString() tenantId: string;
  @IsString() calEventId: string;
  @IsOptional() @IsString() fecha?: string;
  @IsOptional() @IsString() hora?: string;
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() servicio?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() empleado?: string;
  @IsOptional() @IsString() eventoCalendarId?: string;
}

// ─── Public API (JWT-protected) ───────────────────────────────────────────────

@ApiTags('Google Integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
@Controller('api/v1/integrations/google')
export class GoogleIntegrationController {
  private readonly logger = new Logger(GoogleIntegrationController.name);

  constructor(
    private readonly googleService: GoogleIntegrationService,
    private readonly config: ConfigService,
  ) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Obtener URL de autorización OAuth 2.0 de Google' })
  @ApiQuery({ name: 'tenantId', required: true })
  getAuthUrl(@Query('tenantId') tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId requerido');
    return { url: this.googleService.getAuthUrl(tenantId) };
  }

  @Get('status/:tenantId')
  @ApiOperation({ summary: 'Estado de conexión Google del tenant' })
  getStatus(@Param('tenantId') tenantId: string) {
    return this.googleService.getStatus(tenantId);
  }

  @Delete('disconnect/:tenantId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Desconectar Google del tenant' })
  async disconnect(@Param('tenantId') tenantId: string) {
    await this.googleService.disconnect(tenantId);
    return { ok: true };
  }

  @Patch('config/:tenantId')
  @ApiOperation({ summary: 'Actualizar calendarId / spreadsheetId del tenant' })
  async updateConfig(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateGoogleConfigDto,
  ) {
    await this.googleService.updateConfig(tenantId, dto.calendarId, dto.spreadsheetId);
    return { ok: true };
  }
}

// ─── OAuth Callback (PUBLIC — no JWT, Google redirects here) ─────────────────

@ApiTags('Google Integration')
@Controller('api/integrations/google')
export class GoogleCallbackController {
  private readonly logger = new Logger(GoogleCallbackController.name);

  constructor(
    private readonly googleService: GoogleIntegrationService,
    private readonly config: ConfigService,
  ) {}

  @Get('callback')
  @ApiOperation({ summary: '[Public] Callback OAuth 2.0 de Google' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    if (error) {
      this.logger.warn(`OAuth error: ${error}`);
      return res.redirect(`${frontendUrl}/error?msg=google_oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/error?msg=google_oauth_missing_params`);
    }

    try {
      const redirectUrl = await this.googleService.handleCallback(code, state);
      return res.redirect(redirectUrl);
    } catch (err) {
      this.logger.error(`OAuth callback failed: ${err.message}`);
      return res.redirect(`${frontendUrl}/error?msg=google_oauth_failed`);
    }
  }
}

// ─── Internal endpoints (n8n protected with x-internal-key) ──────────────────

@ApiTags('Internal (n8n)')
@ApiHeader({ name: 'x-internal-key', description: 'Clave interna para n8n', required: true })
@UseGuards(InternalKeyGuard)
@Controller('internal/google')
export class GoogleInternalController {
  private readonly logger = new Logger(GoogleInternalController.name);

  constructor(private readonly googleService: GoogleIntegrationService) {}

  // ── Calendar ──────────────────────────────────────────────────────────────

  @Get('calendar/status')
  @ApiOperation({ summary: '[n8n] Estado de conexión Google Calendar' })
  @ApiQuery({ name: 'tenantId', required: true })
  getCalendarStatus(@Query('tenantId') tenantId: string) {
    return this.googleService.getStatus(tenantId);
  }

  @Post('calendar/event')
  @HttpCode(200)
  @ApiOperation({ summary: '[n8n] Crear evento en Google Calendar' })
  createCalendarEvent(@Body() dto: CreateCalendarEventDto) {
    return this.googleService.createCalendarEvent(dto.tenantId, dto);
  }

  @Patch('calendar/event')
  @ApiOperation({ summary: '[n8n] Actualizar evento en Google Calendar' })
  updateCalendarEvent(@Body() dto: UpdateCalendarEventDto) {
    const { tenantId, eventId, ...update } = dto;
    return this.googleService.updateCalendarEvent(tenantId, eventId, update);
  }

  @Delete('calendar/event')
  @HttpCode(200)
  @ApiOperation({ summary: '[n8n] Eliminar evento en Google Calendar' })
  async deleteCalendarEvent(@Body() dto: DeleteCalendarEventDto) {
    await this.googleService.deleteCalendarEvent(dto.tenantId, dto.eventId);
    return { ok: true };
  }

  // ── Sheets ────────────────────────────────────────────────────────────────

  @Post('sheets/append')
  @HttpCode(200)
  @ApiOperation({ summary: '[n8n] Agregar fila en Google Sheets (crea hoja si no existe)' })
  appendSheetRow(@Body() dto: AppendSheetRowDto) {
    const { tenantId, ...row } = dto;
    return this.googleService.appendSheetRow(tenantId, row);
  }

  @Patch('sheets/update-row')
  @HttpCode(200)
  @ApiOperation({ summary: '[n8n] Actualizar fila existente en Sheets por calEventId' })
  async updateSheetRow(@Body() dto: UpdateSheetRowDto) {
    const { tenantId, calEventId, ...update } = dto;
    if (!tenantId || !calEventId) throw new BadRequestException('tenantId y calEventId requeridos');
    return this.googleService.updateSheetRow(tenantId, calEventId, update);
  }

  @Get('sheets/rows')
  @ApiOperation({ summary: '[n8n] Leer filas de citas del Google Sheet del tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'phone', required: false })
  async readSheetRows(
    @Query('tenantId') tenantId: string,
    @Query('phone') phone?: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId requerido');
    const rows = await this.googleService.readSheetRows(tenantId, phone);
    return { rows };
  }

  @Get('sheets/ensure')
  @ApiOperation({ summary: '[n8n] Asegurarse de que existe el spreadsheet' })
  @ApiQuery({ name: 'tenantId', required: true })
  async ensureSpreadsheet(@Query('tenantId') tenantId: string) {
    const spreadsheetId = await this.googleService.ensureSpreadsheet(tenantId);
    return { spreadsheetId };
  }

  @Get('sheets/fix-header')
  @HttpCode(200)
  @ApiOperation({ summary: '[admin] Reparar header del Sheets a 9 columnas (con Empleado)' })
  @ApiQuery({ name: 'tenantId', required: true })
  async fixSheetHeader(@Query('tenantId') tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId requerido');
    return this.googleService.fixSheetHeader(tenantId);
  }

  @Delete('sheets/clear-rows')
  @HttpCode(200)
  @ApiOperation({ summary: '[test] Limpiar todas las filas de citas del Sheets (excepto header)' })
  @ApiQuery({ name: 'tenantId', required: true })
  async clearSheetRows(@Query('tenantId') tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId requerido');
    return this.googleService.clearSheetRows(tenantId);
  }
}
