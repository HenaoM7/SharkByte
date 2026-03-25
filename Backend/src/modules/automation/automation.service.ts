import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AutomationRule } from './schemas/automation-rule.schema';
import { CreateRuleDto } from './dto/create-rule.dto';

@Injectable()
export class AutomationService {
  constructor(
    @InjectModel(AutomationRule.name) private ruleModel: Model<AutomationRule>,
  ) {}

  async findAll(query: { tenantId?: string; isActive?: string; page?: number | null; limit?: number | null }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { tenantId, isActive } = query;
    const filter: any = {};
    if (tenantId) filter.tenantId = tenantId;
    if (isActive !== undefined && isActive !== null) filter.isActive = isActive === 'true';

    const [data, total] = await Promise.all([
      this.ruleModel
        .find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.ruleModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async create(dto: CreateRuleDto): Promise<AutomationRule> {
    return this.ruleModel.create(dto);
  }

  async update(id: string, dto: Partial<CreateRuleDto>, callerTenantId?: string): Promise<AutomationRule> {
    const rule = await this.ruleModel.findById(id);
    if (!rule) throw new NotFoundException(`Regla ${id} no encontrada`);
    if (callerTenantId && rule.tenantId !== callerTenantId) {
      throw new ForbiddenException('No tienes acceso a esta regla.');
    }
    return this.ruleModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async toggle(id: string, callerTenantId?: string): Promise<AutomationRule> {
    const rule = await this.ruleModel.findById(id);
    if (!rule) throw new NotFoundException(`Regla ${id} no encontrada`);
    if (callerTenantId && rule.tenantId !== callerTenantId) {
      throw new ForbiddenException('No tienes acceso a esta regla.');
    }
    rule.isActive = !rule.isActive;
    return rule.save();
  }

  async delete(id: string, callerTenantId?: string): Promise<void> {
    const rule = await this.ruleModel.findById(id);
    if (!rule) throw new NotFoundException(`Regla ${id} no encontrada`);
    if (callerTenantId && rule.tenantId !== callerTenantId) {
      throw new ForbiddenException('No tienes acceso a esta regla.');
    }
    await this.ruleModel.findByIdAndDelete(id);
  }

  async getRulesForTenant(tenantId: string): Promise<AutomationRule[]> {
    return this.ruleModel
      .find({ tenantId, isActive: true })
      .sort({ priority: 1 })
      .lean() as any;
  }

}
