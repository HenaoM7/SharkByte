import {
  Controller, Get, Post, Body, Param, UseGuards, Req, HttpCode,
  Headers, ForbiddenException, Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../auth/guards/ownership.guard';
import { BillingService } from './billing.service';
import { TenantsService } from '../tenants/tenants.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { TenantActionDto } from './dto/create-portal.dto';
import { AdminActivateDto } from './dto/admin-activate.dto';

@ApiTags('Billing')
@Controller()
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private billingService: BillingService,
    private tenantsService: TenantsService,
  ) {}

  /** Verifica que el usuario tiene acceso al tenant solicitado */
  private async assertTenantAccess(user: any, tenantId: string, msg: string): Promise<void> {
    if (user.role === 'super_admin' || user.role === 'admin') return;
    if (user.tenantId === tenantId) return;
    if (user.role === 'owner' && user.userId) {
      try {
        const tenant = await this.tenantsService.findById(tenantId);
        if (tenant && tenant.userId === user.userId) return;
      } catch { /* tenant no encontrado — denegar */ }
    }
    throw new ForbiddenException(msg);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('api/v1/billing/checkout')
  @ApiOperation({ summary: 'Crear sesion de checkout MercadoPago (PreApproval)' })
  async createCheckout(@Body() dto: CreateCheckoutDto, @Req() req: Request) {
    const user = (req as any).user;
    await this.assertTenantAccess(user, dto.tenantId, 'Solo puedes iniciar una suscripcion para tu propio tenant');
    const origin = (req.headers.origin as string) || 'https://sharkbyteia.com';
    return this.billingService.createCheckout(dto.tenantId, dto.planName, origin);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('api/v1/billing/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancelar suscripcion MercadoPago del tenant' })
  async cancelSubscription(@Body() dto: TenantActionDto, @Req() req: Request) {
    const user = (req as any).user;
    await this.assertTenantAccess(user, dto.tenantId, 'No tienes permiso para cancelar la suscripcion de este tenant');
    await this.billingService.cancelSubscription(dto.tenantId);
    return { ok: true, message: 'Suscripcion cancelada. El plan regresa a Free.' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('api/v1/billing/pause')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pausar suscripcion MercadoPago del tenant' })
  async pauseSubscription(@Body() dto: TenantActionDto, @Req() req: Request) {
    const user = (req as any).user;
    await this.assertTenantAccess(user, dto.tenantId, 'No tienes permiso para pausar la suscripcion de este tenant');
    await this.billingService.pauseSubscription(dto.tenantId);
    return { ok: true, message: 'Suscripcion pausada.' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('api/v1/billing/resume')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reanudar suscripcion MercadoPago pausada del tenant' })
  async resumeSubscription(@Body() dto: TenantActionDto, @Req() req: Request) {
    const user = (req as any).user;
    await this.assertTenantAccess(user, dto.tenantId, 'No tienes permiso para reanudar la suscripcion de este tenant');
    await this.billingService.resumeSubscription(dto.tenantId);
    return { ok: true, message: 'Suscripcion reanudada.' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('api/v1/billing/invoices')
  @ApiOperation({ summary: 'Listar pagos de un tenant (desde MercadoPago)' })
  async getInvoices(@Req() req: Request) {
    const user = (req as any).user;
    const tenantId = (req.query as any).tenantId as string;
    if (!tenantId) return [];
    await this.assertTenantAccess(user, tenantId, 'No tienes acceso a los pagos de este tenant');
    return this.billingService.getInvoices(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @Get('api/v1/billing/subscription/:tenantId')
  @ApiOperation({ summary: 'Estado actual de la suscripcion MercadoPago de un tenant' })
  async getSubscription(@Param('tenantId') tenantId: string) {
    return this.billingService.getSubscription(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('api/v1/billing/admin-activate')
  @HttpCode(200)
  @ApiOperation({ summary: '[Admin] Activar plan manualmente y enviar factura al tenant' })
  async adminActivate(@Body() dto: AdminActivateDto, @Req() req: Request) {
    const user = (req as any).user;
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden activar planes manualmente');
    }
    return this.billingService.manualActivate(dto.tenantId, dto.planName);
  }

  // Webhook de MercadoPago — sin JWT, verificacion por firma HMAC-SHA256
  @Post('webhooks/mercadopago')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: '[MercadoPago] Webhook de eventos de suscripcion y pagos' })
  @ApiHeader({ name: 'x-signature', description: 'Firma HMAC-SHA256 de MP', required: false })
  @ApiHeader({ name: 'x-request-id', description: 'Request ID de MP', required: false })
  async mercadopagoWebhook(
    @Body() body: any,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
  ) {
    this.logger.log(`Webhook MP: type=${body?.type} id=${body?.data?.id}`);
    await this.billingService.handleWebhook(body, xSignature, xRequestId);
    return { received: true };
  }
}
