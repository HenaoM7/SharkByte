import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PipelineService } from './pipeline.service';
import { CreateDealDto, UpdateDealDto, MoveDealDto } from './dto/create-deal.dto';

@ApiTags('Pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin', 'owner', 'viewer')
@Controller('api/v1/pipeline')
export class PipelineController {
  constructor(private pipelineService: PipelineService) {}

  private assertOwnership(user: any, tenantId: string) {
    if (user.role === 'super_admin' || user.role === 'admin') return;
    if (user.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a este tenant.');
  }

  @Get()
  @ApiOperation({ summary: 'Pipeline Kanban con deals agrupados por stage' })
  @ApiQuery({ name: 'tenantId', required: true })
  getKanban(@Req() req: any, @Query('tenantId') tenantId: string) {
    this.assertOwnership(req.user, tenantId);
    return this.pipelineService.getKanban(tenantId);
  }

  @Post('deals')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Crear deal' })
  createDeal(@Req() req: any, @Body() dto: CreateDealDto) {
    this.assertOwnership(req.user, dto.tenantId);
    return this.pipelineService.createDeal(dto);
  }

  @Patch('deals/:id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Actualizar deal' })
  @ApiQuery({ name: 'tenantId', required: true })
  updateDeal(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateDealDto,
  ) {
    this.assertOwnership(req.user, tenantId);
    return this.pipelineService.updateDeal(tenantId, id, dto);
  }

  @Patch('deals/:id/move')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Mover deal a otro stage' })
  @ApiQuery({ name: 'tenantId', required: true })
  moveDeal(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: MoveDealDto,
  ) {
    this.assertOwnership(req.user, tenantId);
    return this.pipelineService.moveDeal(tenantId, id, dto.stageId);
  }

  @Delete('deals/:id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Eliminar deal' })
  @ApiQuery({ name: 'tenantId', required: true })
  deleteDeal(@Req() req: any, @Param('id') id: string, @Query('tenantId') tenantId: string) {
    this.assertOwnership(req.user, tenantId);
    return this.pipelineService.deleteDeal(tenantId, id);
  }
}
