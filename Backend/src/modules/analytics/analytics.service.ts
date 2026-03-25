import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { UsageSnapshot } from './schemas/usage-snapshot.schema';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(UsageSnapshot.name) private snapshotModel: Model<UsageSnapshot>,
    @InjectModel('Tenant') private tenantModel: Model<any>,
  ) {}

  async captureSnapshot(): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const tenants = await this.tenantModel
      .find({ deletedAt: null })
      .populate('plan')
      .lean();

    const ops = tenants.map((t: any) => ({
      updateOne: {
        filter: { tenantId: t.tenantId, period },
        update: {
          $set: {
            tenantId: t.tenantId,
            tenantName: t.name,
            planName: t.plan?.name ?? 'free',
            messagesUsed: t.messagesUsed ?? 0,
            tokensUsed: t.tokensUsed ?? 0,
            year,
            month,
            period,
            isActive: t.isActive,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await this.snapshotModel.bulkWrite(ops as any);
      this.logger.log(`Snapshot capturado: ${ops.length} tenants, periodo ${period}`);
    }
  }

  async getOverview() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const [totalTenants, activeTenants, currentMonthStats] = await Promise.all([
      this.tenantModel.countDocuments({ deletedAt: null }),
      this.tenantModel.countDocuments({ deletedAt: null, isActive: true }),
      this.snapshotModel.aggregate([
        { $match: { period } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: '$messagesUsed' },
            totalTokens: { $sum: '$tokensUsed' },
          },
        },
      ]),
    ]);

    const planDist = await this.tenantModel.aggregate([
      { $match: { deletedAt: null } },
      { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
      { $unwind: { path: '$planDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$planDoc.name',
          count: { $sum: 1 },
          pricePerUnit: { $first: '$planDoc.price' },
        },
      },
    ]);

    const estimatedRevenue = planDist.reduce((sum: number, p: any) => {
      if (p._id !== 'free') return sum + (p.count * (p.pricePerUnit || 0));
      return sum;
    }, 0);

    return {
      totalTenants,
      activeTenants,
      estimatedRevenue,
      messagesThisMonth: currentMonthStats[0]?.totalMessages ?? 0,
      tokensThisMonth: currentMonthStats[0]?.totalTokens ?? 0,
      planDistribution: planDist,
    };
  }

  async getMessageVolume(months: number) {
    const periods = this.getLastPeriods(months);
    const data = await this.snapshotModel.aggregate([
      { $match: { period: { $in: periods } } },
      {
        $group: {
          _id: '$period',
          totalMessages: { $sum: '$messagesUsed' },
          totalTokens: { $sum: '$tokensUsed' },
          activeTenants: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return periods.map((p) => {
      const found = data.find((d) => d._id === p);
      return {
        period: p,
        label: this.periodLabel(p),
        totalMessages: found?.totalMessages ?? 0,
        totalTokens: found?.totalTokens ?? 0,
        activeTenants: found?.activeTenants ?? 0,
      };
    });
  }

  async getTenantGrowth(months: number) {
    const periods = this.getLastPeriods(months);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const data = await this.tenantModel.aggregate([
      { $match: { deletedAt: null, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          newTenants: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return periods.map((p) => {
      const [y, m] = p.split('-').map(Number);
      const found = data.find((d) => d._id.year === y && d._id.month === m);
      return {
        period: p,
        label: this.periodLabel(p),
        newTenants: found?.newTenants ?? 0,
      };
    });
  }

  async getPlanConversion() {
    const snapshots = await this.snapshotModel.aggregate([
      { $sort: { tenantId: 1, period: 1 } },
      {
        $group: {
          _id: '$tenantId',
          plans: { $push: '$planName' },
          tenantName: { $first: '$tenantName' },
        },
      },
    ]);

    const totalTracked = snapshots.length;
    const upgraded = snapshots.filter(
      (s: any) => s.plans.length > 1 && s.plans.some((p: string) => p !== 'free'),
    ).length;

    const currentDist = await this.tenantModel.aggregate([
      { $match: { deletedAt: null } },
      { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
      { $unwind: { path: '$planDoc', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$planDoc.name', count: { $sum: 1 } } },
    ]);

    return {
      totalTracked,
      upgraded,
      conversionRate: totalTracked > 0 ? Math.round((upgraded / totalTracked) * 100) : 0,
      planDistribution: currentDist,
    };
  }
  async getTopTenants(limit: number) {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return this.snapshotModel
      .find({ period })
      .sort({ messagesUsed: -1 })
      .limit(limit)
      .lean();
  }

  async exportCsv(months: number, res: Response): Promise<void> {
    const periods = this.getLastPeriods(months);
    const snapshots = await this.snapshotModel
      .find({ period: { $in: periods } })
      .sort({ period: 1, messagesUsed: -1 })
      .lean();

    const header = 'tenantId,tenantName,plan,mensajes,tokens,periodo,activo\n';
    const rows = snapshots
      .map((s: any) =>
        [s.tenantId, `"${s.tenantName}"`, s.planName, s.messagesUsed, s.tokensUsed, s.period, s.isActive].join(','),
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sharkbyte-analytics-${months}m.csv"`);
    res.send('\uFEFF' + header + rows);
  }

  private getLastPeriods(months: number): string[] {
    const periods: string[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return periods;
  }

  private periodLabel(period: string): string {
    const [y, m] = period.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  }
}
