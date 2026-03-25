import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SalesService } from './sales.service';

class CreateSaleBodyDto {
  @IsString() clientPhone: string;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() productName?: string;
  @IsOptional() @IsString() productDetails?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) quantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() totalAmount?: number;
  @IsOptional() @IsString() paymentMessage?: string;
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsIn(['confirmed', 'pending', 'cancelled']) status?: string;
  @IsOptional() @IsString() conversationId?: string;
  @IsOptional() @IsString() dealId?: string;
}

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin', 'owner', 'viewer')
@Controller('api/v1/sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  private assertOwnership(user: any, tenantId: string) {
    if (user.role === 'super_admin' || user.role === 'admin') return;
    if (user.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a este tenant.');
  }

  @Post()
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Registrar venta manual' })
  @ApiBody({ type: CreateSaleBodyDto })
  @ApiQuery({ name: 'tenantId', required: true })
  async create(
    @Req() req: any,
    @Query('tenantId') tenantId: string,
    @Body() body: CreateSaleBodyDto,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    this.assertOwnership(req.user, tenantId);
    return this.salesService.create({ ...body, tenantId });
  }

  @Get()
  @ApiOperation({ summary: 'Ventas por tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  findByTenant(
    @Req() req: any,
    @Query('tenantId') tenantId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    this.assertOwnership(req.user, tenantId);
    return this.salesService.findByTenant(tenantId, limit, page);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de ventas por tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  getStats(@Req() req: any, @Query('tenantId') tenantId: string) {
    this.assertOwnership(req.user, tenantId);
    return this.salesService.getStats(tenantId);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Ingresos mensuales últimos 6 meses' })
  @ApiQuery({ name: 'tenantId', required: true })
  getMonthly(@Req() req: any, @Query('tenantId') tenantId: string) {
    this.assertOwnership(req.user, tenantId);
    return this.salesService.getMonthlyRevenue(tenantId);
  }
}
