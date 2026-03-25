import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, ParseFilePipe,
  FileTypeValidator, MaxFileSizeValidator, HttpCode, Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/tenants/:tenantId/products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Listar productos del tenant' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'available', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Param('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('available') available?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findAll(tenantId, { search, category, available, page, limit });
  }

  @Get('categories')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Obtener categorías únicas del tenant' })
  getCategories(@Param('tenantId') tenantId: string) {
    return this.productsService.getCategories(tenantId);
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  @ApiOperation({ summary: 'Obtener producto por ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseGuards(OwnershipGuard)
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 uploads/hora por IP
  @UseInterceptors(FileInterceptor('image', { storage: undefined })) // memoria
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Crear producto (con imagen opcional)' })
  create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ }),
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    return this.productsService.create(tenantId, dto, image);
  }

  @Patch(':id')
  @UseGuards(OwnershipGuard)
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 uploads/hora por IP
  @UseInterceptors(FileInterceptor('image', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ }),
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    return this.productsService.update(id, tenantId, dto, image);
  }

  @Delete(':id')
  @UseGuards(OwnershipGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar producto' })
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    await this.productsService.remove(id, tenantId);
  }
}
