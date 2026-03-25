import {
  Controller, Get, Put, Post, Param, Body, UseGuards, NotFoundException,
  UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { TenantConfigService } from './tenant-config.service';
import { UpsertTenantConfigDto } from './dto/upsert-tenant-config.dto';

@ApiTags('Business Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
@Controller('api/v1/tenants/:tenantId/business-config')
export class TenantConfigController {
  constructor(private configService: TenantConfigService) {}

  @Get()
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Obtener configuración completa del negocio' })
  async getConfig(@Param('tenantId') tenantId: string) {
    const config = await this.configService.findByTenantId(tenantId);
    if (!config) throw new NotFoundException('Configuración no encontrada para este tenant');
    return config;
  }

  @Put()
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Crear o actualizar configuración completa del negocio' })
  async upsertConfig(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpsertTenantConfigDto,
  ) {
    return this.configService.upsert(tenantId, dto);
  }

  @Post('payment-qr')
  @Roles('super_admin', 'admin', 'owner')
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 uploads/hora
  @UseInterceptors(FileInterceptor('image', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen QR de pago (Nequi, Bancolombia, etc.)' })
  async uploadPaymentQr(
    @Param('tenantId') tenantId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
        ],
        fileIsRequired: true,
      }),
    )
    image: Express.Multer.File,
  ) {
    return this.configService.uploadPaymentQr(tenantId, image);
  }
}
