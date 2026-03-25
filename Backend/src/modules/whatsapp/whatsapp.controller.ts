import { Controller, Post, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@SkipThrottle() // Polling endpoints — authenticated, rate-limiting handled at Nginx level
@UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
@Controller('api/v1/whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post(':tenantId/connect')
  @ApiOperation({ summary: 'Crear instancia en Evolution API y obtener QR para conectar WhatsApp' })
  connect(@Param('tenantId') tenantId: string) {
    return this.whatsAppService.connect(tenantId);
  }

  @Get(':tenantId/qr')
  @ApiOperation({ summary: 'Obtener QR fresco para instancia existente' })
  getQR(@Param('tenantId') tenantId: string) {
    return this.whatsAppService.getQR(tenantId);
  }

  @Get(':tenantId/status')
  @ApiOperation({ summary: 'Consultar estado de conexión de la instancia WhatsApp' })
  getStatus(@Param('tenantId') tenantId: string) {
    return this.whatsAppService.getStatus(tenantId);
  }

  @Post(':tenantId/disconnect')
  @ApiOperation({ summary: 'Desconectar WhatsApp (logout de Evolution API)' })
  disconnect(@Param('tenantId') tenantId: string) {
    return this.whatsAppService.disconnect(tenantId);
  }

  @Delete(':tenantId/instance')
  @ApiOperation({ summary: 'Eliminar instancia de Evolution API completamente' })
  deleteInstance(@Param('tenantId') tenantId: string) {
    return this.whatsAppService.deleteInstance(tenantId);
  }
}
