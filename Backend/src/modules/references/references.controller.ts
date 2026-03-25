import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReferencesService } from './references.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/reference.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';

@ApiTags('References')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
@Controller('api/v1/references')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Listar todas las referencias del negocio' })
  findAll(@Param('tenantId') tenantId: string) {
    return this.referencesService.findAll(tenantId);
  }

  @Post(':tenantId')
  @ApiOperation({ summary: 'Crear nueva referencia' })
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateReferenceDto) {
    return this.referencesService.create(tenantId, dto);
  }

  @Patch(':tenantId/:id')
  @ApiOperation({ summary: 'Actualizar referencia' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReferenceDto,
  ) {
    return this.referencesService.update(tenantId, id, dto);
  }

  @Delete(':tenantId/:id')
  @ApiOperation({ summary: 'Eliminar referencia' })
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.referencesService.remove(tenantId, id);
  }
}
