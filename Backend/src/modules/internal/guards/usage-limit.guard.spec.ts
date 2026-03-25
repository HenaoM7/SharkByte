/**
 * Tests unitarios — UsageLimitGuard
 *
 * Cubre:
 *  - canActivate: permite pasar cuando el tenant puede procesar
 *  - canActivate: lanza HttpException 429 para cada razón de bloqueo
 *  - canActivate: permite pasar si no hay tenantId en el body (sin validar)
 *  - Estructura de la respuesta 429: statusCode, message, reason, tenantId
 *
 * Pruebas de exhaustividad:
 *  - Todas las razones de bloqueo: tenant_not_found, tenant_inactive,
 *    no_evolution_credentials, messages_limit_reached, tokens_limit_reached
 *  - Razón desconocida → mensaje genérico
 */

import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { UsageLimitGuard } from './usage-limit.guard';
import { UsageService } from '../../usage/usage.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeContext = (body: Record<string, any> = {}): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({ body }),
  }),
} as any);

const makeUsageService = (result: { ok: boolean; reason?: string }): jest.Mocked<UsageService> =>
  ({
    canProcessDetailed: jest.fn().mockResolvedValue(result),
  } as any);

// ── Suite principal ───────────────────────────────────────────────────────────

describe('UsageLimitGuard', () => {
  // ── Caso: tenant puede procesar ───────────────────────────────────────────

  it('retorna true cuando el tenant puede procesar', async () => {
    const guard = new UsageLimitGuard(makeUsageService({ ok: true }));
    const ctx = makeContext({ tenantId: 'tenant_123' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  // ── Caso: sin tenantId en body ────────────────────────────────────────────

  it('retorna true sin verificar cuando no hay tenantId en el body', async () => {
    const usageService = makeUsageService({ ok: false, reason: 'tenant_not_found' });
    const guard = new UsageLimitGuard(usageService);
    const ctx = makeContext({});

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(usageService.canProcessDetailed).not.toHaveBeenCalled();
  });

  // ── Pruebas de exhaustividad: todas las razones de bloqueo ────────────────

  const blockingReasons = [
    {
      reason: 'tenant_not_found',
      expectedMsg: 'Tenant no encontrado.',
    },
    {
      reason: 'tenant_inactive',
      expectedMsg: 'El tenant está inactivo y no puede procesar mensajes.',
    },
    {
      reason: 'no_evolution_credentials',
      expectedMsg: 'El tenant no tiene credenciales de Evolution API configuradas.',
    },
    {
      reason: 'messages_limit_reached',
      expectedMsg: 'Límite de mensajes del plan alcanzado para este mes.',
    },
    {
      reason: 'tokens_limit_reached',
      expectedMsg: 'Límite de tokens del plan alcanzado para este mes.',
    },
  ];

  blockingReasons.forEach(({ reason, expectedMsg }) => {
    it(`lanza HttpException 429 con mensaje correcto para reason="${reason}"`, async () => {
      const guard = new UsageLimitGuard(makeUsageService({ ok: false, reason }));
      const ctx = makeContext({ tenantId: 'tenant_123' });

      try {
        await guard.canActivate(ctx);
        fail('Debería haber lanzado HttpException');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

        const body = err.getResponse();
        expect(body.statusCode).toBe(429);
        expect(body.message).toBe(expectedMsg);
        expect(body.reason).toBe(reason);
        expect(body.tenantId).toBe('tenant_123');
      }
    });
  });

  it('usa mensaje genérico para razón desconocida', async () => {
    const guard = new UsageLimitGuard(
      makeUsageService({ ok: false, reason: 'unknown_reason' }),
    );
    const ctx = makeContext({ tenantId: 'tenant_123' });

    try {
      await guard.canActivate(ctx);
    } catch (err) {
      expect(err.getResponse().message).toBe(
        'El tenant no puede procesar más mensajes.',
      );
    }
  });

  // ── Verifica que se llama con el tenantId correcto ─────────────────────────

  it('llama a canProcessDetailed con el tenantId del body', async () => {
    const usageService = makeUsageService({ ok: true });
    const guard = new UsageLimitGuard(usageService);
    const ctx = makeContext({ tenantId: 'tenant_xyz', otherField: 'value' });

    await guard.canActivate(ctx);

    expect(usageService.canProcessDetailed).toHaveBeenCalledWith('tenant_xyz');
  });
});
