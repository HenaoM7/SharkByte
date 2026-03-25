import { Controller, Get, Query, Res, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'KPIs generales de la plataforma' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('message-volume')
  @ApiOperation({ summary: 'Volumen de mensajes por periodo' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getMessageVolume(@Query('months', new DefaultValuePipe(6), ParseIntPipe) months: number) {
    return this.analyticsService.getMessageVolume(months);
  }

  @Get('tenant-growth')
  @ApiOperation({ summary: 'Crecimiento de tenants por mes' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getTenantGrowth(@Query('months', new DefaultValuePipe(6), ParseIntPipe) months: number) {
    return this.analyticsService.getTenantGrowth(months);
  }

  @Get('plan-conversion')
  @ApiOperation({ summary: 'Tasa de conversion free hacia pago' })
  getPlanConversion() {
    return this.analyticsService.getPlanConversion();
  }

  @Get('top-tenants')
  @ApiOperation({ summary: 'Top tenants por uso este mes' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopTenants(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.analyticsService.getTopTenants(limit);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar snapshots como CSV' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  async exportCsv(
    @Query('months', new DefaultValuePipe(6), ParseIntPipe) months: number,
    @Res() res: Response,
  ) {
    return this.analyticsService.exportCsv(months, res);
  }

  // Endpoint manual para disparar captura de snapshot (util en dev/testing)
  @Get('capture-snapshot')
  @ApiOperation({ summary: '[Admin] Capturar snapshot manual del mes actual' })
  async captureSnapshot() {
    await this.analyticsService.captureSnapshot();
    return { ok: true, message: 'Snapshot capturado exitosamente' };
  }
}
