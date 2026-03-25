/**
 * Tests unitarios — TenantsService
 *
 * Cubre:
 *  - create: tenant nuevo, duplicado de teléfono
 *  - findAll: paginación, filtros, aislamiento por rol owner
 *  - findById: encontrado, no encontrado
 *  - findByPhone: encontrado, no encontrado
 *  - activate: con credenciales propias, con instanceName, sin nada (error)
 *  - updateStatus: activo e inactivo sincronizan isActive
 *  - updatePlan: free→pro crea suscripción, pro→free la cancela
 *  - deactivate: ok, tenant inexistente
 *  - softDelete: marca deletedAt, tenant inexistente
 *  - restore: restaura tenant soft-deleted
 *  - setOwner: actualiza userId
 *  - findByInstance: por instanceName
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './tenants.schema';
import { Subscription } from '../billing/schemas/subscription.schema';
import { PlansService } from '../plans/plans.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makePlan = (name = 'free') => ({
  _id: `plan-${name}-id`,
  name,
  maxMessages: name === 'free' ? 100 : -1,
  maxTokens: name === 'free' ? 50000 : -1,
  price: name === 'free' ? 0 : 999998,
});

const makeTenant = (overrides: Partial<any> = {}) => ({
  _id: 'tenant-obj-id',
  tenantId: 'tenant_573001234567',
  name: 'Mi Empresa',
  phone: '+573001234567',
  email: 'empresa@test.com',
  plan: makePlan('free'),
  status: 'inactive',
  isActive: false,
  config: {},
  evolutionInstance: {},
  googleCredentials: {},
  messagesUsed: 0,
  tokensUsed: 0,
  deletedAt: null,
  ...overrides,
});

/** Crea un mock de modelo Mongoose con chainable populate/select/sort/skip/limit/exec */
const makeTenantModelMock = () => {
  const chainMock = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  return {
    findOne: jest.fn().mockReturnValue(chainMock),
    findOneAndUpdate: jest.fn().mockReturnValue(chainMock),
    find: jest.fn().mockReturnValue(chainMock),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    _chain: chainMock,
  };
};

// ── Suite principal ───────────────────────────────────────────────────────────

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantModel: ReturnType<typeof makeTenantModelMock>;
  let subscriptionModel: any;
  let plansService: jest.Mocked<Partial<PlansService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let connection: any;

  beforeEach(async () => {
    tenantModel = makeTenantModelMock();
    subscriptionModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    plansService = {
      findByName: jest.fn().mockResolvedValue(makePlan('free')),
    };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const cfg: Record<string, string> = {
          NODE_ENV: 'test',
          EVOLUTION_API_URL: 'http://localhost:8080',
          EVOLUTION_API_KEY: 'test-key',
          N8N_WEBHOOK_URL: 'http://localhost:5678/webhook/whatsapp-inbound',
        };
        return cfg[key];
      }),
    };
    connection = { db: { collection: jest.fn().mockReturnValue({ deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }), updateMany: jest.fn().mockResolvedValue({}) }) } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getModelToken(Tenant.name), useValue: tenantModel },
        { provide: getModelToken(Subscription.name), useValue: subscriptionModel },
        { provide: getConnectionToken(), useValue: connection },
        { provide: PlansService, useValue: plansService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto = { name: 'Empresa Test', phone: '+573001234567', email: 'emp@test.com', planName: 'free' };

    it('crea un tenant con tenantId derivado del teléfono', async () => {
      // findOne en create() es un await directo sin .populate()
      (tenantModel.findOne as jest.Mock).mockResolvedValue(null);
      const tenantDoc = makeTenant();
      const created = { ...tenantDoc, populate: jest.fn().mockResolvedValue(tenantDoc) };
      tenantModel.create.mockResolvedValue(created);

      await service.create(dto);

      expect(tenantModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant_573001234567',
          name: dto.name,
          status: 'inactive',
          isActive: false,
        }),
      );
    });

    it('lanza ConflictException si el teléfono ya está registrado', async () => {
      (tenantModel.findOne as jest.Mock).mockResolvedValue(makeTenant());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('asigna planName free por defecto si no se especifica', async () => {
      (tenantModel.findOne as jest.Mock).mockResolvedValue(null);
      const tenantDoc = makeTenant();
      const created = { ...tenantDoc, populate: jest.fn().mockResolvedValue(tenantDoc) };
      tenantModel.create.mockResolvedValue(created);

      await service.create({ name: 'X', phone: '+571000000000', email: 'x@x.com' });

      expect(plansService.findByName).toHaveBeenCalledWith('free');
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('retorna el tenant cuando existe', async () => {
      const tenant = makeTenant();
      tenantModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(tenant),
      });

      const result = await service.findById('tenant_573001234567');
      expect(result).toEqual(tenant);
    });

    it('lanza NotFoundException si no existe', async () => {
      tenantModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByPhone ───────────────────────────────────────────────────────────

  describe('findByPhone()', () => {
    it('retorna el tenant por teléfono', async () => {
      const tenant = makeTenant();
      tenantModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(tenant),
      });

      const result = await service.findByPhone('+573001234567');
      expect(result.phone).toBe('+573001234567');
    });

    it('lanza NotFoundException si no hay tenant con ese teléfono', async () => {
      tenantModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findByPhone('+000000')).rejects.toThrow(NotFoundException);
    });
  });

  // ── activate ──────────────────────────────────────────────────────────────

  describe('activate()', () => {
    it('activa el tenant si tiene credenciales propias (apiUrl + apiKey)', async () => {
      const tenant = makeTenant({
        evolutionInstance: { apiUrl: 'http://evo.url', apiKey: 'key123' },
      });
      (tenantModel.findOne as jest.Mock).mockResolvedValue(tenant);
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ ...tenant, isActive: true, status: 'active' }),
      });

      const result = await service.activate('tenant_573001234567');
      expect(result.isActive).toBe(true);
      expect(result.status).toBe('active');
    });

    it('activa el tenant si tiene instanceName (usa servidor global)', async () => {
      const tenant = makeTenant({
        evolutionInstance: { instanceName: 'mi-instancia' },
      });
      (tenantModel.findOne as jest.Mock).mockResolvedValue(tenant);
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ ...tenant, isActive: true, status: 'active' }),
      });

      const result = await service.activate('tenant_573001234567');
      expect(result.isActive).toBe(true);
    });

    it('lanza BadRequestException si no tiene instancia ni credenciales', async () => {
      const tenant = makeTenant({ evolutionInstance: {} });
      (tenantModel.findOne as jest.Mock).mockResolvedValue(tenant);

      await expect(service.activate('tenant_573001234567')).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el tenant no existe', async () => {
      (tenantModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.activate('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('marca isActive=true cuando status=active', async () => {
      const updated = makeTenant({ status: 'active', isActive: true });
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.updateStatus('tenant_573001234567', 'active');

      expect(tenantModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { status: 'active', isActive: true },
        expect.any(Object),
      );
      expect(result.isActive).toBe(true);
    });

    it('marca isActive=false cuando status=inactive', async () => {
      const updated = makeTenant({ status: 'inactive', isActive: false });
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.updateStatus('tenant_573001234567', 'inactive');
      expect(result.isActive).toBe(false);
    });

    it('lanza NotFoundException si el tenant no existe', async () => {
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateStatus('nonexistent', 'active'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updatePlan ────────────────────────────────────────────────────────────

  describe('updatePlan()', () => {
    it('crea/actualiza suscripción al cambiar a plan pro', async () => {
      plansService.findByName.mockResolvedValue(makePlan('pro') as any);
      const updated = makeTenant({ plan: makePlan('pro') });
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(updated),
      });

      await service.updatePlan('tenant_573001234567', 'pro');

      expect(subscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { tenantId: 'tenant_573001234567' },
        expect.objectContaining({ status: 'authorized', planName: 'pro' }),
        { upsert: true },
      );
    });

    it('cancela suscripción al regresar a plan free', async () => {
      plansService.findByName.mockResolvedValue(makePlan('free') as any);
      const updated = makeTenant();
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(updated),
      });

      await service.updatePlan('tenant_573001234567', 'free');

      expect(subscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant_573001234567' }),
        expect.objectContaining({ status: 'cancelled' }),
      );
    });
  });

  // ── deactivate ────────────────────────────────────────────────────────────

  describe('deactivate()', () => {
    it('retorna { ok: true } al desactivar', async () => {
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(makeTenant({ isActive: false })),
      });
      // findOneAndUpdate devuelve directamente el doc (sin populate en deactivate)
      (tenantModel.findOneAndUpdate as jest.Mock).mockResolvedValue(makeTenant({ isActive: false }));

      const result = await service.deactivate('tenant_573001234567');
      expect(result).toEqual({ ok: true });
    });

    it('lanza NotFoundException si el tenant no existe', async () => {
      (tenantModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(service.deactivate('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('marca deletedAt y status=cancelled', async () => {
      (tenantModel.findOneAndUpdate as jest.Mock).mockResolvedValue(
        makeTenant({ deletedAt: new Date(), status: 'cancelled' }),
      );

      const result = await service.softDelete('tenant_573001234567');
      expect(result).toEqual({ ok: true });
      expect(tenantModel.findOneAndUpdate).toHaveBeenCalledWith(
        { tenantId: 'tenant_573001234567', deletedAt: null },
        expect.objectContaining({ status: 'cancelled', isActive: false }),
        expect.any(Object),
      );
    });

    it('lanza NotFoundException si el tenant no existe o ya está eliminado', async () => {
      (tenantModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(service.softDelete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── restore ───────────────────────────────────────────────────────────────

  describe('restore()', () => {
    it('restaura un tenant soft-deleted', async () => {
      const restored = makeTenant({ deletedAt: null, status: 'inactive' });
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(restored),
      });

      const result = await service.restore('tenant_573001234567');
      expect(result.deletedAt).toBeNull();
      expect(result.status).toBe('inactive');
    });

    it('lanza NotFoundException si no existe o no está eliminado', async () => {
      tenantModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.restore('not-deleted')).rejects.toThrow(NotFoundException);
    });
  });

  // ── setOwner ──────────────────────────────────────────────────────────────

  describe('setOwner()', () => {
    it('actualiza userId del tenant', async () => {
      tenantModel.updateOne.mockResolvedValue({});

      await service.setOwner('tenant_573001234567', 'user-abc');

      expect(tenantModel.updateOne).toHaveBeenCalledWith(
        { tenantId: 'tenant_573001234567' },
        { userId: 'user-abc' },
      );
    });
  });

  // ── findAll — aislamiento multi-tenant ────────────────────────────────────

  describe('findAll() — aislamiento multi-tenant', () => {
    it('filtra por userId cuando el rol es owner', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      tenantModel.find.mockReturnValue(chain);
      tenantModel.countDocuments.mockResolvedValue(0);

      await service.findAll({}, { role: 'owner', userId: 'owner-user-id' });

      // El filtro debe incluir userId
      expect(tenantModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-user-id' }),
      );
    });

    it('NO filtra por userId cuando el rol es super_admin', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      tenantModel.find.mockReturnValue(chain);
      tenantModel.countDocuments.mockResolvedValue(0);

      await service.findAll({}, { role: 'super_admin', userId: 'admin-id' });

      expect(tenantModel.find).toHaveBeenCalledWith(
        expect.not.objectContaining({ userId: expect.anything() }),
      );
    });

    it('retorna estructura paginada correcta', async () => {
      const tenants = [makeTenant(), makeTenant({ tenantId: 'tenant_2' })];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(tenants),
      };
      tenantModel.find.mockReturnValue(chain);
      tenantModel.countDocuments.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.pages).toBe(1);
    });
  });

  // ── findByInstance ────────────────────────────────────────────────────────

  describe('findByInstance()', () => {
    it('retorna tenant por instanceName', async () => {
      const tenant = makeTenant({ evolutionInstance: { instanceName: 'my-instance' } });
      tenantModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(tenant),
      });

      const result = await service.findByInstance('my-instance');
      expect(result).toEqual(tenant);
    });

    it('retorna null si no hay tenant con esa instancia', async () => {
      tenantModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByInstance('unknown');
      expect(result).toBeNull();
    });
  });
});
