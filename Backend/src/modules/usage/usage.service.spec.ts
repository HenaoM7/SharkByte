/**
 * Tests unitarios — UsageService
 *
 * Cubre:
 *  - recordUsage: incrementa contadores
 *  - getUsage: retorna uso actual + límites del plan
 *  - canProcess: delega a canProcessDetailed
 *  - canProcessDetailed: todos los motivos de bloqueo:
 *      tenant_not_found, tenant_inactive, no_evolution_credentials,
 *      messages_limit_reached, tokens_limit_reached, ok
 *  - resetAllMonthly: resetea contadores de todos los tenants
 *
 * Pruebas de exhaustividad (valores límite):
 *  - messagesUsed == maxMessages-1 (ok)
 *  - messagesUsed == maxMessages (bloqueado)
 *  - plan con maxMessages=-1 (ilimitado, siempre ok)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { UsageService } from './usage.service';
import { Tenant } from '../tenants/tenants.schema';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makePopulatedTenant = (overrides: Partial<any> = {}) => ({
  tenantId: 'tenant_123',
  isActive: true,
  messagesUsed: 0,
  tokensUsed: 0,
  usageResetAt: new Date(),
  evolutionInstance: { instanceName: 'my-instance' },
  plan: {
    name: 'free',
    maxMessages: 100,
    maxTokens: 50000,
  },
  ...overrides,
});

const makeChain = (resolveWith: any) => ({
  populate: jest.fn().mockResolvedValue(resolveWith),
});

// ── Suite principal ───────────────────────────────────────────────────────────

describe('UsageService', () => {
  let service: UsageService;
  let tenantModel: {
    findOne: jest.Mock;
    updateOne: jest.Mock;
    updateMany: jest.Mock;
  };

  beforeEach(async () => {
    tenantModel = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: getModelToken(Tenant.name), useValue: tenantModel },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── recordUsage ───────────────────────────────────────────────────────────

  describe('recordUsage()', () => {
    it('incrementa messagesUsed y tokensUsed con $inc', async () => {
      await service.recordUsage('tenant_123', 3, 1500);

      expect(tenantModel.updateOne).toHaveBeenCalledWith(
        { tenantId: 'tenant_123' },
        { $inc: { messagesUsed: 3, tokensUsed: 1500 } },
      );
    });

    it('acepta incremento de cero (no hace nada dañino)', async () => {
      await service.recordUsage('tenant_123', 0, 0);

      expect(tenantModel.updateOne).toHaveBeenCalledWith(
        { tenantId: 'tenant_123' },
        { $inc: { messagesUsed: 0, tokensUsed: 0 } },
      );
    });
  });

  // ── getUsage ──────────────────────────────────────────────────────────────

  describe('getUsage()', () => {
    it('retorna uso actual y límites del plan', async () => {
      const tenant = makePopulatedTenant({ messagesUsed: 25, tokensUsed: 12000 });
      tenantModel.findOne.mockReturnValue(makeChain(tenant));

      const result = await service.getUsage('tenant_123');

      expect(result.messagesUsed).toBe(25);
      expect(result.tokensUsed).toBe(12000);
      expect(result.limits.maxMessages).toBe(100);
      expect(result.limits.maxTokens).toBe(50000);
      expect(result.plan).toBe('free');
    });

    it('lanza NotFoundException si el tenant no existe', async () => {
      tenantModel.findOne.mockReturnValue(makeChain(null));

      await expect(service.getUsage('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── canProcessDetailed ────────────────────────────────────────────────────

  describe('canProcessDetailed()', () => {
    it('retorna ok=true si todo está bien', async () => {
      tenantModel.findOne.mockReturnValue(makeChain(makePopulatedTenant()));

      const result = await service.canProcessDetailed('tenant_123');
      expect(result).toEqual({ ok: true });
    });

    it('retorna tenant_not_found si no existe el tenant', async () => {
      tenantModel.findOne.mockReturnValue(makeChain(null));

      const result = await service.canProcessDetailed('ghost');
      expect(result).toEqual({ ok: false, reason: 'tenant_not_found' });
    });

    it('retorna tenant_inactive si isActive es false', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({ isActive: false })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result).toEqual({ ok: false, reason: 'tenant_inactive' });
    });

    it('retorna no_evolution_credentials si no hay instancia ni credenciales propias', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({ evolutionInstance: {} })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result).toEqual({ ok: false, reason: 'no_evolution_credentials' });
    });

    it('acepta credenciales propias (apiUrl + apiKey) como válidas', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({
          evolutionInstance: { apiUrl: 'http://evo.test', apiKey: 'key123' },
        })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result.ok).toBe(true);
    });

    it('retorna messages_limit_reached cuando messagesUsed >= maxMessages', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({
          messagesUsed: 100,
          plan: { name: 'free', maxMessages: 100, maxTokens: 50000 },
        })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result).toEqual({ ok: false, reason: 'messages_limit_reached' });
    });

    it('retorna tokens_limit_reached cuando tokensUsed >= maxTokens', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({
          tokensUsed: 50000,
          plan: { name: 'free', maxMessages: 100, maxTokens: 50000 },
        })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result).toEqual({ ok: false, reason: 'tokens_limit_reached' });
    });

    // ── Pruebas de exhaustividad (valores límite) ─────────────────────────

    it('[LÍMITE] messagesUsed = maxMessages - 1 → ok (justo antes del límite)', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({
          messagesUsed: 99,
          plan: { name: 'free', maxMessages: 100, maxTokens: 50000 },
        })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result.ok).toBe(true);
    });

    it('[LÍMITE] messagesUsed = maxMessages → bloqueado (exactamente en el límite)', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({
          messagesUsed: 100,
          plan: { name: 'free', maxMessages: 100, maxTokens: 50000 },
        })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result.ok).toBe(false);
    });

    it('[LÍMITE] plan ilimitado (maxMessages=-1) siempre permite procesar', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({
          messagesUsed: 999999,
          tokensUsed: 999999,
          plan: { name: 'pro', maxMessages: -1, maxTokens: -1 },
        })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result.ok).toBe(true);
    });

    it('[LÍMITE] tokensUsed = maxTokens - 1 → ok', async () => {
      tenantModel.findOne.mockReturnValue(
        makeChain(makePopulatedTenant({
          tokensUsed: 49999,
          plan: { name: 'free', maxMessages: 100, maxTokens: 50000 },
        })),
      );

      const result = await service.canProcessDetailed('tenant_123');
      expect(result.ok).toBe(true);
    });
  });

  // ── canProcess ────────────────────────────────────────────────────────────

  describe('canProcess()', () => {
    it('retorna true cuando canProcessDetailed devuelve ok=true', async () => {
      tenantModel.findOne.mockReturnValue(makeChain(makePopulatedTenant()));

      expect(await service.canProcess('tenant_123')).toBe(true);
    });

    it('retorna false cuando el tenant está bloqueado', async () => {
      tenantModel.findOne.mockReturnValue(makeChain(null));

      expect(await service.canProcess('ghost')).toBe(false);
    });
  });

  // ── resetAllMonthly ───────────────────────────────────────────────────────

  describe('resetAllMonthly()', () => {
    it('resetea messagesUsed y tokensUsed a 0 para todos los tenants', async () => {
      await service.resetAllMonthly();

      expect(tenantModel.updateMany).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          $set: expect.objectContaining({
            messagesUsed: 0,
            tokensUsed: 0,
          }),
        }),
      );
    });

    it('establece usageResetAt con la fecha actual', async () => {
      const before = Date.now();
      await service.resetAllMonthly();
      const after = Date.now();

      const call = (tenantModel.updateMany as jest.Mock).mock.calls[0][1];
      const resetAt: Date = call.$set.usageResetAt;
      expect(resetAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(resetAt.getTime()).toBeLessThanOrEqual(after);
    });
  });
});
