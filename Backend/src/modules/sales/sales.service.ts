import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { ContactsService } from '../contacts/contacts.service';
import { PipelineService } from '../pipeline/pipeline.service';

export interface CreateSaleDto {
  tenantId: string;
  clientName?: string;
  clientPhone: string;
  clientId?: string;
  productName?: string;
  productDetails?: string;
  quantity?: number;
  totalAmount?: number | null;
  paymentMessage?: string;
  deliveryAddress?: string;
  businessName?: string;
  status?: string;
  confirmedAt?: Date;
  conversationId?: string;
  dealId?: string;
}

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    private contactsService: ContactsService,
    private pipelineService: PipelineService,
  ) {}

  async create(dto: CreateSaleDto): Promise<Sale> {
    const confirmedAt = dto.confirmedAt ?? new Date();
    const recompraScheduledFor = new Date(confirmedAt);
    recompraScheduledFor.setDate(recompraScheduledFor.getDate() + 3);

    const sale = new this.saleModel({
      ...dto,
      confirmedAt,
      recompraScheduledFor,
    });
    const saved = await sale.save();

    // Fire-and-forget: upsert contact record linked to this sale
    if (saved.clientPhone) {
      this.contactsService.upsertByPhone(saved.tenantId, saved.clientPhone, {
        name: saved.clientName || '',
        lastInteractionAt: confirmedAt,
      }).catch(() => {});
    }

    // Fire-and-forget: auto-link deal and mark as Won if sale is confirmed
    if (saved.clientPhone && saved.status === 'confirmed') {
      this.pipelineService
        .findOpenDealByContact(saved.tenantId, saved.clientPhone)
        .then(async (deal) => {
          if (deal) {
            const dealId = (deal as any)._id?.toString();
            await this.pipelineService.markDealWon(saved.tenantId, dealId, (saved as any)._id.toString());
            // Back-fill dealId into the sale
            await this.saleModel.findByIdAndUpdate((saved as any)._id, { $set: { dealId } });
          }
        })
        .catch(() => {});
    }

    return saved;
  }

  async findByTenant(
    tenantId: string,
    limit = 10,
    page = 1,
  ): Promise<{ data: Sale[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.saleModel
        .find({ tenantId })
        .sort({ confirmedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.saleModel.countDocuments({ tenantId }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getStats(tenantId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, monthCount, monthRevenue, topProducts, uniqueClientsArr] =
      await Promise.all([
        this.saleModel.countDocuments({
          tenantId,
          status: 'confirmed',
          confirmedAt: { $gte: startOfDay },
        }),
        this.saleModel.countDocuments({
          tenantId,
          status: 'confirmed',
          confirmedAt: { $gte: startOfMonth },
        }),
        this.saleModel.aggregate([
          {
            $match: {
              tenantId,
              status: 'confirmed',
              confirmedAt: { $gte: startOfMonth },
              totalAmount: { $ne: null },
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        this.saleModel.aggregate([
          { $match: { tenantId, status: 'confirmed' } },
          { $group: { _id: '$productName', count: { $sum: '$quantity' } } },
          { $sort: { count: -1 } },
          { $limit: 3 },
        ]),
        this.saleModel.distinct('clientPhone', { tenantId, status: 'confirmed' }),
      ]);

    return {
      today,
      monthCount,
      monthRevenue: monthRevenue[0]?.total ?? 0,
      topProducts: topProducts.map((p) => ({ name: p._id, count: p.count })),
      uniqueClients: uniqueClientsArr.length,
    };
  }

  async getMonthlyRevenue(tenantId: string): Promise<{ month: string; revenue: number; count: number }[]> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const rows = await this.saleModel.aggregate([
      {
        $match: {
          tenantId,
          status: 'confirmed',
          confirmedAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$confirmedAt' }, month: { $month: '$confirmedAt' } },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return rows.map((r) => ({
      month: `${MONTHS[r._id.month - 1]} ${r._id.year}`,
      revenue: r.revenue ?? 0,
      count: r.count,
    }));
  }

  async getPendingRecompra(): Promise<Sale[]> {
    return this.saleModel
      .find({
        status: 'confirmed',
        recompraSent: false,
        recompraScheduledFor: { $lte: new Date() },
      })
      .lean();
  }

  async markRecompraSent(saleId: string): Promise<void> {
    await this.saleModel.findByIdAndUpdate(saleId, { recompraSent: true });
  }
}
