import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UsageService } from '../usage/usage.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { QueryTenantsDto } from './dto/query-tenants.dto';
import { UpdateEvolutionInstanceDto } from './dto/update-evolution-instance.dto';
import { UpdateGoogleCredentialsDto } from './dto/update-google-credentials.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/tenants')
export class TenantsController {
  constructor(
    private tenantsService: TenantsService,
    private usageService: UsageService,
  ) {}

  @Post()
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Crear nuevo tenant' })
  create(@Body() dto: CreateTenantDto, @Request() req) {
    // Owners siempre crean con plan free — solo admins pueden asignar otros planes
    if (req.user?.role === 'owner') dto.planName = 'free';
    return this.tenantsService.create(dto, req.user?.userId);
  }

  @Get()
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Listar tenants con paginación, búsqueda y filtros' })
  findAll(@Query() query: QueryTenantsDto, @Request() req) {
    return this.tenantsService.findAll(query, req.user);
  }

  @Get(':tenantId')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Obtener tenant por ID (solo el propio tenant para owners)' })
  findOne(@Param('tenantId') tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }

  @Patch(':tenantId/config')
  @Roles('super_admin', 'admin', 'owner')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Actualizar configuración del tenant' })
  updateConfig(
    @Param('tenantId') tenantId: string,
    @Body() config: Record<string, any>,
  ) {
    return this.tenantsService.updateConfig(tenantId, config);
  }

  @Patch(':tenantId/plan')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Cambiar plan del tenant (free | pro | enterprise)' })
  updatePlan(@Param('tenantId') tenantId: string, @Body() dto: UpdatePlanDto) {
    return this.tenantsService.updatePlan(tenantId, dto.planName);
  }

  @Patch(':tenantId/activate')
  @Roles('super_admin', 'admin', 'owner')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Activar tenant — requiere WhatsApp configurado. Owner puede activar el suyo.' })
  activate(@Param('tenantId') tenantId: string) {
    return this.tenantsService.activate(tenantId);
  }

  @Patch(':tenantId/deactivate')
  @Roles('super_admin', 'admin', 'owner')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Pausar tenant — owner puede pausar su propio negocio' })
  deactivate(@Param('tenantId') tenantId: string) {
    return this.tenantsService.deactivate(tenantId);
  }

  @Patch(':tenantId/status')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Cambiar status del tenant (active | inactive | suspended | trial | cancelled)' })
  updateStatus(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.tenantsService.updateStatus(tenantId, dto.status);
  }

  @Patch(':tenantId/evolution-instance')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Vincular instancia de Evolution API al tenant (owner puede editar la suya)' })
  updateEvolutionInstance(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateEvolutionInstanceDto,
  ) {
    return this.tenantsService.updateEvolutionInstance(tenantId, {
      instanceName: dto.instanceName,
      status: dto.status || 'connected',
      apiUrl: dto.apiUrl,
      apiKey: dto.apiKey,
    });
  }

  @Patch(':tenantId/google-credentials')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Guardar credenciales Google (Service Account + Sheets + Calendar)' })
  updateGoogleCredentials(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateGoogleCredentialsDto,
  ) {
    return this.tenantsService.updateGoogleCredentials(tenantId, dto);
  }

  @Get(':tenantId/usage')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Ver uso y límites del tenant' })
  getUsage(@Param('tenantId') tenantId: string) {
    return this.usageService.getUsage(tenantId);
  }

  @Delete(':tenantId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Eliminar tenant (soft-delete — recuperable)' })
  softDelete(@Param('tenantId') tenantId: string) {
    return this.tenantsService.softDelete(tenantId);
  }

  @Patch(':tenantId/restore')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Restaurar tenant eliminado (reversar soft-delete)' })
  restore(@Param('tenantId') tenantId: string) {
    return this.tenantsService.restore(tenantId);
  }

  @Delete(':tenantId/permanent')
  @Roles('super_admin', 'admin', 'owner')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Eliminar tenant DEFINITIVAMENTE — borra todo: tenant, config, productos, ventas, Google, suscripción, archivos DO Spaces' })
  hardDelete(@Param('tenantId') tenantId: string) {
    return this.tenantsService.hardDelete(tenantId);
  }
}
