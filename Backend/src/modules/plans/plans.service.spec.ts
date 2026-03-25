/**
 * Tests unitarios — PlansService
 *
 * Cubre:
 *  - onModuleInit: llama a seed() al inicializarse
 *  - seed: crea/actualiza los 3 planes por defecto con upsert
 *  - findAll: retorna todos los planes ordenados por precio
 *  - findByName: encontrado, no encontrado
 *  - updateMpPlanId: actualiza mpPlanId e mpInitPoint
 *
 * Pruebas de exhaustividad:
 *  - Planes con maxMessages=-1 (ilimitado)
 *  - Plan free con precio 0
 *  - billingPeriod: monthly vs annual
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Plan } from './plans.schema';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makePlan = (name: string, overrides: Partial<any> = {}) => ({
  _id: `plan-${name}`,
  name,
  maxMessages: name === 'free' ? 100 : -1,
  maxTokens: name === 'free' ? 50000 : -1,
  price: name === 'free' ? 0 : name === 'pro' ? 999998 : 9999998,
  billingPeriod: name === 'enterprise' ? 'annual' : 'monthly',
  mpPlanId: null,
  mpInitPoint: null,
  ...overrides,
});

const makePlanModelMock = () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue(null),
  find: jest.fn(),
  findOne: jest.fn(),
});

// ── Suite principal ───────────────────────────────────────────────────────────

describe('PlansService', () => {
  let service: PlansService;
  let planModel: ReturnType<typeof makePlanModelMock>;

  beforeEach(async () => {
    planModel = makePlanModelMock();

    const sortMock = { sort: jest.fn().mockReturnThis(), select: jest.fn().mockResolvedValue([]) };
    planModel.find.mockReturnValue(sortMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: getModelToken(Plan.name), useValue: planModel },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── seed / onModuleInit ───────────────────────────────────────────────────

  describe('seed()', () => {
    it('hace upsert de los 3 planes por defecto (free, pro, enterprise)', async () => {
      planModel.findOneAndUpdate.mockResolvedValue(makePlan('free'));

      await service.seed();

      expect(planModel.findOneAndUpdate).toHaveBeenCalledTimes(3);

      const names = (planModel.findOneAndUpdate as jest.Mock).mock.calls.map(
        (call) => call[0].name,
      );
      expect(names).toContain('free');
      expect(names).toContain('pro');
      expect(names).toContain('enterprise');
    });

    it('usa upsert:true para crear si no existe', async () => {
      await service.seed();

      const firstCall = (planModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(firstCall[2]).toEqual(expect.objectContaining({ upsert: true }));
    });

    it('plan free tiene precio 0 y maxMessages=100', async () => {
      await service.seed();

      const freeCall = (planModel.findOneAndUpdate as jest.Mock).mock.calls.find(
        (call) => call[0].name === 'free',
      );
      expect(freeCall[1].$set.price).toBe(0);
      expect(freeCall[1].$set.maxMessages).toBe(100);
    });

    it('plan pro tiene maxMessages=-1 (ilimitado)', async () => {
      await service.seed();

      const proCall = (planModel.findOneAndUpdate as jest.Mock).mock.calls.find(
        (call) => call[0].name === 'pro',
      );
      expect(proCall[1].$set.maxMessages).toBe(-1);
      expect(proCall[1].$set.maxTokens).toBe(-1);
    });

    it('plan enterprise tiene billingPeriod=annual', async () => {
      await service.seed();

      const entCall = (planModel.findOneAndUpdate as jest.Mock).mock.calls.find(
        (call) => call[0].name === 'enterprise',
      );
      expect(entCall[1].$set.billingPeriod).toBe('annual');
    });
  });

  describe('onModuleInit()', () => {
    it('llama a seed al inicializarse el módulo', async () => {
      const seedSpy = jest.spyOn(service, 'seed').mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(seedSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retorna lista de planes ordenados por precio', async () => {
      const plans = [makePlan('free'), makePlan('pro'), makePlan('enterprise')];
      const chain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(plans),
      };
      planModel.find.mockReturnValue(chain);

      const result = await service.findAll();

      expect(result).toHaveLength(3);
      expect(chain.sort).toHaveBeenCalledWith({ price: 1 });
    });
  });

  // ── findByName ────────────────────────────────────────────────────────────

  describe('findByName()', () => {
    it('retorna el plan cuando existe', async () => {
      const plan = makePlan('pro');
      planModel.findOne.mockResolvedValue(plan);

      const result = await service.findByName('pro');

      expect(result.name).toBe('pro');
      expect(planModel.findOne).toHaveBeenCalledWith({ name: 'pro' });
    });

    it('lanza NotFoundException si el plan no existe', async () => {
      planModel.findOne.mockResolvedValue(null);

      await expect(service.findByName('diamond')).rejects.toThrow(NotFoundException);
    });

    it('[EXHAUSTIVIDAD] busca correctamente los 3 nombres válidos', async () => {
      for (const name of ['free', 'pro', 'enterprise']) {
        planModel.findOne.mockResolvedValue(makePlan(name));
        const result = await service.findByName(name);
        expect(result.name).toBe(name);
      }
    });
  });

  // ── updateMpPlanId ────────────────────────────────────────────────────────

  describe('updateMpPlanId()', () => {
    it('actualiza mpPlanId del plan', async () => {
      planModel.findOneAndUpdate.mockResolvedValue(makePlan('pro', { mpPlanId: 'mp-123' }));

      await service.updateMpPlanId('pro', 'mp-123');

      expect(planModel.findOneAndUpdate).toHaveBeenCalledWith(
        { name: 'pro' },
        expect.objectContaining({ mpPlanId: 'mp-123' }),
      );
    });

    it('actualiza mpInitPoint cuando se provee', async () => {
      planModel.findOneAndUpdate.mockResolvedValue(makePlan('pro'));

      await service.updateMpPlanId('pro', 'mp-123', 'https://init.point/abc');

      const updateArg = (planModel.findOneAndUpdate as jest.Mock).mock.calls[0][1];
      expect(updateArg.mpInitPoint).toBe('https://init.point/abc');
    });

    it('NO actualiza mpInitPoint si no se provee', async () => {
      planModel.findOneAndUpdate.mockResolvedValue(makePlan('pro'));

      await service.updateMpPlanId('pro', 'mp-123');

      const updateArg = (planModel.findOneAndUpdate as jest.Mock).mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('mpInitPoint');
    });
  });
});
