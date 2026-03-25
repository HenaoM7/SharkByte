import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { ChannelsService } from './channels.service';
import { UpsertChannelDto } from './dto/upsert-channel.dto';

@ApiTags('Channels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OwnershipGuard)
@Controller('api/v1/channels')
export class ChannelsController {
  constructor(private readonly service: ChannelsService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Listar todos los canales configurados del tenant' })
  findAll(@Param('tenantId') tenantId: string) {
    return this.service.findByTenantId(tenantId);
  }

  @Get(':tenantId/:platform')
  @ApiOperation({ summary: 'Obtener configuración de un canal específico' })
  findOne(
    @Param('tenantId') tenantId: string,
    @Param('platform') platform: string,
  ) {
    return this.service.findByTenantAndPlatform(tenantId, platform);
  }

  @Post(':tenantId')
  @ApiOperation({ summary: 'Crear o actualizar configuración de canal (upsert)' })
  upsert(@Param('tenantId') tenantId: string, @Body() dto: UpsertChannelDto) {
    return this.service.upsert(tenantId, dto);
  }

  @Post(':tenantId/meta/test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validar Page Access Token de Meta' })
  testMeta(
    @Param('tenantId') _tenantId: string,
    @Body('accessToken') accessToken: string,
  ) {
    return this.service.testMetaToken(accessToken);
  }

  @Delete(':tenantId/:platform')
  @ApiOperation({ summary: 'Desconectar y eliminar canal' })
  remove(
    @Param('tenantId') tenantId: string,
    @Param('platform') platform: string,
  ) {
    return this.service.remove(tenantId, platform);
  }
}
