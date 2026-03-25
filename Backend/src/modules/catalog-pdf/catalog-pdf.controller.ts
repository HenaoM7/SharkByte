import {
  Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors,
  UploadedFile, ParseFilePipe, FileTypeValidator, MaxFileSizeValidator, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { CatalogPdfService } from './catalog-pdf.service';

@ApiTags('CatalogPdf')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OwnershipGuard)
@Controller('api/v1/tenants/:tenantId/catalog-pdf')
export class CatalogPdfController {
  constructor(private catalogPdfService: CatalogPdfService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener PDF de catálogo del tenant' })
  findOne(@Param('tenantId') tenantId: string) {
    return this.catalogPdfService.findByTenant(tenantId);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 PDFs/hora por IP
  @UseInterceptors(FileInterceptor('pdf', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir / reemplazar PDF de catálogo' })
  upsert(
    @Param('tenantId') tenantId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'application/pdf' }),
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20 MB
        ],
        fileIsRequired: true,
      }),
    )
    pdf: Express.Multer.File,
  ) {
    return this.catalogPdfService.upsert(tenantId, pdf);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar PDF de catálogo' })
  async remove(@Param('tenantId') tenantId: string) {
    await this.catalogPdfService.remove(tenantId);
  }
}
