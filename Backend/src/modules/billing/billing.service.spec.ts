import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { BillingService } from './billing.service';
import { Subscription } from './schemas/subscription.schema';
import { TenantsService } from '../tenants/tenants.service';
import { PlansService } from '../plans/plans.service';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscriptionModel = () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
});

const mockTenantsService = () => ({
  findById: jest.fn(),
  updatePlan: jest.fn(),
  updateStatus: jest.fn(),
});

const mockPlansService = () => ({
  findByName: jest.fn(),
  updateMpPlanId: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn((key: string) => {
    const cfg: Record<string, any> = {
      MP_ACCESS_TOKEN: null,        // Sin MP real — billing desactivado para mayoría de tests
      MP_WEBHOOK_SECRET: 'test-secret-key',
      MP_CURRENCY: 'COP',
      FRONTEND_URL: 'https://sharkbyteia.com',
      SMTP_HOST: null,
    };
    return cfg[key] ?? null;
  }),
});

// ── Suite ────────────────────────────────────────────────────────────────────

describe('BillingService', () => {
  let service: BillingService;
  let subscriptionModel: ReturnType<typeof mockSubscriptionModel>;
  let tenantsService: ReturnType<typeof mockTenantsService>;
  let configService: ReturnType<typeof mockConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getModelToken(Subscription.name), useFactory: mockSubscriptionModel },
        { provide: TenantsService, useFactory: mockTenantsService },
        { provide: PlansService, useFactory: mockPlansService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get(BillingService);
    subscriptionModel = module.get(getModelToken(Subscription.name));
    tenantsService = module.get(TenantsService);
    configService = module.get(ConfigService);
  });

  // ── createCheckout ──────────────────────────────────────────────────────────

  describe('createCheckout', () => {
    it('rechaza planes inválidos', async () => {
      await expect(service.createCheckout('tenant_1', 'free', 'https://x.com'))
        .rejects.toThrow(BadRequestException);
      await expect(service.createCheckout('tenant_1', 'enterprise_annual', 'https://x.com'))
        .rejects.toThrow(BadRequestException);
    });

    it('lanza ServiceUnavailableException si MP no está configurado', async () => {
      await expect(service.createCheckout('tenant_1', 'pro', 'https://x.com'))
        .rejects.toThrow('MercadoPago no configurado');
    });
  });

  // ── manualActivate ──────────────────────────────────────────────────────────

  describe('manualActivate', () => {
    it('rechaza planes inválidos (free, enterprise_annual)', async () => {
      await expect(service.manualActivate('tenant_1', 'free')).rejects.toThrow(BadRequestException);
      await expect(service.manualActivate('tenant_1', 'enterprise_annual')).rejects.toThrow(BadRequestException);
    });

    it('activa el plan pro correctamente', async () => {
      const tenant = { _id: 'tid', tenantId: 'tenant_1', email: 'test@test.com', name: 'Test' };
      tenantsService.findById.mockResolvedValue(tenant);
      tenantsService.updatePlan.mockResolvedValue(undefined);
      tenantsService.updateStatus.mockResolvedValue(undefined);
      subscriptionModel.findOneAndUpdate.mockResolvedValue({
        tenantId: 'tenant_1',
        planName: 'pro',
        status: 'authorized',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      });

      const result = await service.manualActivate('tenant_1', 'pro');

      expect(tenantsService.updatePlan).toHaveBeenCalledWith('tenant_1', 'pro');
      expect(tenantsService.updateStatus).toHaveBeenCalledWith('tenant_1', 'active');
      expect(result.ok).toBe(true);
    });

    it('lanza NotFoundException si el tenant no existe', async () => {
      tenantsService.findById.mockResolvedValue(null);
      await expect(service.manualActivate('tenant_x', 'pro')).rejects.toThrow(NotFoundException);
    });

    it('el periodo enterprise es 12 meses', async () => {
      const tenant = { _id: 'tid', tenantId: 'tenant_1', email: 'e@e.com', name: 'T' };
      tenantsService.findById.mockResolvedValue(tenant);
      tenantsService.updatePlan.mockResolvedValue(undefined);
      tenantsService.updateStatus.mockResolvedValue(undefined);

      let capturedUpdate: any;
      subscriptionModel.findOneAndUpdate.mockImplementation((_q: any, update: any) => {
        capturedUpdate = update;
        return Promise.resolve({ ...update });
      });

      await service.manualActivate('tenant_1', 'enterprise');

      const start: Date = capturedUpdate.currentPeriodStart;
      const end: Date = capturedUpdate.currentPeriodEnd;
      const diffMonths =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      expect(diffMonths).toBe(12);
    });

    it('el periodo pro es 1 mes', async () => {
      const tenant = { _id: 'tid', tenantId: 'tenant_1', email: 'e@e.com', name: 'T' };
      tenantsService.findById.mockResolvedValue(tenant);
      tenantsService.updatePlan.mockResolvedValue(undefined);
      tenantsService.updateStatus.mockResolvedValue(undefined);

      let capturedUpdate: any;
      subscriptionModel.findOneAndUpdate.mockImplementation((_q: any, update: any) => {
        capturedUpdate = update;
        return Promise.resolve({ ...update });
      });

      await service.manualActivate('tenant_1', 'pro');

      const start: Date = capturedUpdate.currentPeriodStart;
      const end: Date = capturedUpdate.currentPeriodEnd;
      const diffMonths =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      expect(diffMonths).toBe(1);
    });
  });

  // ── handleWebhook: verificación de firma ────────────────────────────────────

  describe('handleWebhook — verificación de firma HMAC-SHA256', () => {
    function buildSignature(dataId: string, requestId: string, ts: string, secret: string): string {
      const manifest = `id:${dataId};request-id:${requestId};ts:${ts}`;
      const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
      return `ts=${ts},v1=${hash}`;
    }

    it('acepta webhooks con firma válida', async () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const dataId = '99999';
      const requestId = 'req-abc-123';
      const sig = buildSignature(dataId, requestId, ts, 'test-secret-key');

      // type desconocido → solo valida firma y retorna
      await expect(
        service.handleWebhook({ type: 'unknown', data: { id: dataId } }, sig, requestId),
      ).resolves.not.toThrow();
    });

    it('rechaza webhooks con firma inválida', async () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const badSig = `ts=${ts},v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`;

      await expect(
        service.handleWebhook({ type: 'payment', data: { id: '1' } }, badSig, 'req-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza cuando falta x-signature y el secreto está configurado', async () => {
      // Webhook sin signature cuando hay secreto → debe rechazar
      await expect(
        service.handleWebhook({ type: 'payment', data: { id: '1' } }, '', 'req-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('acepta cuando no hay secreto configurado (MP_WEBHOOK_SECRET vacío)', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'MP_WEBHOOK_SECRET' ? null : null,
      );
      // Recrear servicio sin secreto
      const module2 = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: getModelToken(Subscription.name), useFactory: mockSubscriptionModel },
          { provide: TenantsService, useFactory: mockTenantsService },
          { provide: PlansService, useFactory: mockPlansService },
          { provide: ConfigService, useFactory: () => ({ get: () => null }) },
        ],
      }).compile();
      const svc2 = module2.get(BillingService);
      await expect(svc2.handleWebhook({ type: 'unknown' }, '', 'req')).resolves.not.toThrow();
    });
  });

  // ── cancelSubscription ──────────────────────────────────────────────────────
  // cancelSubscription llama requireMp() antes de consultar la DB.
  // Sin MP_ACCESS_TOKEN, lanza ServiceUnavailableException en todos los casos.
  describe('cancelSubscription', () => {
    it('lanza ServiceUnavailableException si MP no está configurado', async () => {
      await expect(service.cancelSubscription('tenant_1'))
        .rejects.toThrow('MercadoPago no configurado');
    });
  });

  // ── getSubscription ──────────────────────────────────────────────────────────

  describe('getSubscription', () => {
    it('retorna estado free si no hay suscripción en DB', async () => {
      subscriptionModel.findOne.mockResolvedValue(null);
      const result = await service.getSubscription('tenant_1');
      expect(result).toEqual({ tenantId: 'tenant_1', status: 'free', mpPreapprovalId: null });
    });

    it('retorna la suscripción existente', async () => {
      const sub = { tenantId: 'tenant_1', status: 'authorized', planName: 'pro' };
      subscriptionModel.findOne.mockResolvedValue(sub);
      const result = await service.getSubscription('tenant_1');
      expect(result).toBe(sub);
    });
  });
});
