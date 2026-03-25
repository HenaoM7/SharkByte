import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutomationService } from './automation.service';
import { CreateRuleDto } from './dto/create-rule.dto';

@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/automation')
export class AutomationController {
  constructor(private automationService: AutomationService) {}

  @Get('rules')
  @ApiOperation({ summary: 'Listar reglas de automatizacion' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Solo admins pueden filtrar por tenantId arbitrario' })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const user = req.user;
    const isAdmin = user.role === 'super_admin' || user.role === 'admin';
    const effectiveTenantId = isAdmin ? tenantId : user.tenantId;
    return this.automationService.findAll({ tenantId: effectiveTenantId, isActive, page, limit });
  }

  @Post('rules')
  @ApiOperation({ summary: 'Crear regla de automatizacion' })
  create(@Req() req: any, @Body() dto: CreateRuleDto) {
    const user = req.user;
    const isAdmin = user.role === 'super_admin' || user.role === 'admin';
    const tenantId = isAdmin ? dto.tenantId : user.tenantId;
    return this.automationService.create({ ...dto, tenantId });
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Actualizar regla de automatizacion' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateRuleDto>) {
    const user = req.user;
    const callerTenantId = user.role === 'super_admin' || user.role === 'admin' ? undefined : user.tenantId;
    return this.automationService.update(id, dto, callerTenantId);
  }

  @Patch('rules/:id/toggle')
  @ApiOperation({ summary: 'Activar/desactivar regla' })
  toggle(@Req() req: any, @Param('id') id: string) {
    const user = req.user;
    const callerTenantId = user.role === 'super_admin' || user.role === 'admin' ? undefined : user.tenantId;
    return this.automationService.toggle(id, callerTenantId);
  }

  @Delete('rules/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar regla de automatizacion' })
  async delete(@Req() req: any, @Param('id') id: string) {
    const user = req.user;
    const callerTenantId = user.role === 'super_admin' || user.role === 'admin' ? undefined : user.tenantId;
    await this.automationService.delete(id, callerTenantId);
  }
}
