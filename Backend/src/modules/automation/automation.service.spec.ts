/**
 * Tests unitarios — AutomationService
 *
 * Cubre:
 *  - findAll: paginación, filtro por tenantId, filtro por isActive
 *  - create: crea regla correctamente
 *  - update: regla existente, no encontrada, acceso denegado (tenant distinto)
 *  - toggle: activa/desactiva, no encontrada, acceso denegado
 *  - delete: elimina, no encontrada, acceso denegado
 *  - getRulesForTenant: retorna reglas activas ordenadas por prioridad
 *
 * Pruebas de exhaustividad:
 *  - toggle: alterna de true a false y de false a true
 *  - aislamiento multi-tenant: callerTenantId !== rule.tenantId → ForbiddenException
 *  - callerTenantId undefined → sin validación de tenant (acceso admin)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { AutomationRule } from './schemas/automation-rule.schema';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeRule = (overrides: Partial<any> = {}) => ({
  _id: 'rule-id-1',
  tenantId: 'tenant_123',
  name: 'Saludo automático',
  trigger: 'hola',
  action: 'Enviar saludo',
  isActive: true,
  priority: 1,
  save: jest.fn().mockImplementation(function() { return Promise.resolve(this); }),
  ...overrides,
});

const makeLeanChain = (data: any[]) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(data),
});

// ── Suite principal ───────────────────────────────────────────────────────────

describe('AutomationService', () => {
  let service: AutomationService;
  let ruleModel: any;

  beforeEach(async () => {
    ruleModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: getModelToken(AutomationRule.name), useValue: ruleModel },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retorna reglas paginadas', async () => {
      const rules = [makeRule(), makeRule({ _id: 'rule-2' })];
      ruleModel.find.mockReturnValue(makeLeanChain(rules));
      ruleModel.countDocuments.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('filtra por tenantId si se provee', async () => {
      ruleModel.find.mockReturnValue(makeLeanChain([]));
      ruleModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ tenantId: 'tenant_123' });

      expect(ruleModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant_123' }),
      );
    });

    it('filtra por isActive=true cuando se pasa "true"', async () => {
      ruleModel.find.mockReturnValue(makeLeanChain([]));
      ruleModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ isActive: 'true' });

      expect(ruleModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('filtra por isActive=false cuando se pasa "false"', async () => {
      ruleModel.find.mockReturnValue(makeLeanChain([]));
      ruleModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ isActive: 'false' });

      expect(ruleModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('no filtra por isActive cuando no se provee', async () => {
      ruleModel.find.mockReturnValue(makeLeanChain([]));
      ruleModel.countDocuments.mockResolvedValue(0);

      await service.findAll({});

      const filterArg = (ruleModel.find as jest.Mock).mock.calls[0][0];
      expect(filterArg).not.toHaveProperty('isActive');
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crea una regla con los datos del DTO', async () => {
      const dto = {
        tenantId: 'tenant_123',
        name: 'Auto-respuesta',
        trigger: 'precio',
        action: 'Responder con precios',
        isActive: true,
        priority: 2,
      };
      const created = makeRule(dto);
      ruleModel.create.mockResolvedValue(created);

      const result = await service.create(dto as any);

      expect(ruleModel.create).toHaveBeenCalledWith(dto);
      expect(result.name).toBe('Auto-respuesta');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('actualiza la regla cuando existe y el tenantId coincide', async () => {
      const rule = makeRule();
      ruleModel.findById.mockResolvedValue(rule);
      const updated = makeRule({ name: 'Nuevo Nombre' });
      ruleModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update('rule-id-1', { name: 'Nuevo Nombre' }, 'tenant_123');

      expect(result.name).toBe('Nuevo Nombre');
      expect(ruleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'rule-id-1',
        { name: 'Nuevo Nombre' },
        { new: true },
      );
    });

    it('lanza NotFoundException si la regla no existe', async () => {
      ruleModel.findById.mockResolvedValue(null);

      await expect(
        service.update('ghost-id', { name: 'X' }, 'tenant_123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el tenantId no coincide', async () => {
      ruleModel.findById.mockResolvedValue(makeRule({ tenantId: 'tenant_123' }));

      await expect(
        service.update('rule-id-1', { name: 'X' }, 'otro-tenant'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite actualizar sin validación de tenant cuando callerTenantId es undefined (admin)', async () => {
      const rule = makeRule();
      ruleModel.findById.mockResolvedValue(rule);
      ruleModel.findByIdAndUpdate.mockResolvedValue(rule);

      await expect(
        service.update('rule-id-1', { name: 'Admin Update' }, undefined),
      ).resolves.not.toThrow();
    });
  });

  // ── toggle ────────────────────────────────────────────────────────────────

  describe('toggle()', () => {
    it('cambia isActive de true a false', async () => {
      const rule = makeRule({ isActive: true });
      ruleModel.findById.mockResolvedValue(rule);

      await service.toggle('rule-id-1', 'tenant_123');

      expect(rule.isActive).toBe(false);
      expect(rule.save).toHaveBeenCalled();
    });

    it('cambia isActive de false a true', async () => {
      const rule = makeRule({ isActive: false });
      ruleModel.findById.mockResolvedValue(rule);

      await service.toggle('rule-id-1', 'tenant_123');

      expect(rule.isActive).toBe(true);
    });

    it('lanza NotFoundException si la regla no existe', async () => {
      ruleModel.findById.mockResolvedValue(null);

      await expect(service.toggle('ghost', 'tenant_123')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el tenant no coincide', async () => {
      ruleModel.findById.mockResolvedValue(makeRule({ tenantId: 'tenant_123' }));

      await expect(service.toggle('rule-id-1', 'otro-tenant')).rejects.toThrow(ForbiddenException);
    });

    it('permite toggle sin validación de tenant cuando callerTenantId es undefined', async () => {
      const rule = makeRule({ isActive: true });
      ruleModel.findById.mockResolvedValue(rule);

      await service.toggle('rule-id-1', undefined);

      expect(rule.isActive).toBe(false);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('elimina la regla cuando existe y el tenant coincide', async () => {
      ruleModel.findById.mockResolvedValue(makeRule());
      ruleModel.findByIdAndDelete.mockResolvedValue({});

      await service.delete('rule-id-1', 'tenant_123');

      expect(ruleModel.findByIdAndDelete).toHaveBeenCalledWith('rule-id-1');
    });

    it('lanza NotFoundException si la regla no existe', async () => {
      ruleModel.findById.mockResolvedValue(null);

      await expect(service.delete('ghost', 'tenant_123')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el tenant no coincide', async () => {
      ruleModel.findById.mockResolvedValue(makeRule({ tenantId: 'tenant_123' }));

      await expect(service.delete('rule-id-1', 'otro-tenant')).rejects.toThrow(ForbiddenException);
    });

    it('NO lanza error cuando callerTenantId es undefined (modo admin)', async () => {
      ruleModel.findById.mockResolvedValue(makeRule());
      ruleModel.findByIdAndDelete.mockResolvedValue({});

      await expect(service.delete('rule-id-1', undefined)).resolves.not.toThrow();
    });
  });

  // ── getRulesForTenant ─────────────────────────────────────────────────────

  describe('getRulesForTenant()', () => {
    it('retorna reglas activas ordenadas por prioridad', async () => {
      const rules = [
        makeRule({ priority: 1 }),
        makeRule({ _id: 'rule-2', priority: 3 }),
      ];
      const chain = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(rules),
      };
      ruleModel.find.mockReturnValue(chain);

      const result = await service.getRulesForTenant('tenant_123');

      expect(ruleModel.find).toHaveBeenCalledWith({ tenantId: 'tenant_123', isActive: true });
      expect(chain.sort).toHaveBeenCalledWith({ priority: 1 });
      expect(result).toHaveLength(2);
    });

    it('retorna array vacío si no hay reglas activas', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      ruleModel.find.mockReturnValue(chain);

      const result = await service.getRulesForTenant('tenant_sin_reglas');
      expect(result).toEqual([]);
    });
  });
});
