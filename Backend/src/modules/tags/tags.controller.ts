import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, Req, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';

@ApiTags('Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin', 'owner', 'viewer')
@Controller('api/v1/tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  private assertOwnership(user: any, tenantId: string) {
    if (user.role === 'super_admin' || user.role === 'admin') return;
    if (user.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a este tenant.');
  }

  @Get()
  @ApiOperation({ summary: 'Listar tags del tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  findAll(@Req() req: any, @Query('tenantId') tenantId: string) {
    this.assertOwnership(req.user, tenantId);
    return this.tagsService.findAll(tenantId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Crear tag' })
  create(@Req() req: any, @Body() dto: CreateTagDto) {
    this.assertOwnership(req.user, dto.tenantId);
    return this.tagsService.create(dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Eliminar tag' })
  @ApiQuery({ name: 'tenantId', required: true })
  remove(@Req() req: any, @Param('id') id: string, @Query('tenantId') tenantId: string) {
    this.assertOwnership(req.user, tenantId);
    return this.tagsService.remove(tenantId, id);
  }
}
