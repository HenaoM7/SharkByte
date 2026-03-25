import { Injectable, OnModuleInit, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan } from './plans.schema';

// Precios en COP (pesos colombianos)
const DEFAULT_PLANS = [
  {
    name: 'free',
    maxMessages: 100,
    maxTokens: 50000,
    price: 0,
    billingPeriod: 'monthly',
  },
  {
    name: 'pro',
    maxMessages: -1,     // Ilimitado
    maxTokens: -1,       // Ilimitado
    price: 999998,       // $999.998 COP/mes
    billingPeriod: 'monthly',
  },
  {
    name: 'enterprise',
    maxMessages: -1,     // Ilimitado
    maxTokens: -1,       // Ilimitado
    price: 9999998,      // $9.999.998 COP/año (~2 meses gratis vs mensual)
    billingPeriod: 'annual',
  },
];

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectModel(Plan.name) private planModel: Model<Plan>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    for (const plan of DEFAULT_PLANS) {
      const result = await this.planModel.findOneAndUpdate(
        { name: plan.name },
        { $set: { ...plan, mpPlanId: null, mpInitPoint: null } },
        { upsert: true, new: true },
      );
      if (!result) {
        this.logger.log(`Plan '${plan.name}' creado`);
      }
    }
  }

  async findAll(): Promise<Plan[]> {
    return this.planModel.find().select('-__v').sort({ price: 1 });
  }

  async findByName(name: string): Promise<Plan> {
    const plan = await this.planModel.findOne({ name });
    if (!plan) throw new NotFoundException(`Plan '${name}' no encontrado`);
    return plan;
  }

  // Cachea el MP PreApprovalPlan ID e init_point para no recrear el plan en cada checkout
  async updateMpPlanId(planName: string, mpPlanId: string, mpInitPoint?: string): Promise<void> {
    await this.planModel.findOneAndUpdate(
      { name: planName },
      { mpPlanId, ...(mpInitPoint && { mpInitPoint }) },
    );
    this.logger.log(`Plan '${planName}' mpPlanId=${mpPlanId}`);
  }
}
