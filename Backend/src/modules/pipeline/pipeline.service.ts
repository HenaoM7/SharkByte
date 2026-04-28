import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pipeline, PipelineDocument, PipelineStage } from './schemas/pipeline.schema';
import { Deal, DealDocument } from './schemas/deal.schema';
import { CreateDealDto, UpdateDealDto } from './dto/create-deal.dto';

const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'nuevo_lead',  name: 'Nuevo Lead',   order: 1, color: '#6366f1' },
  { id: 'contactado',  name: 'Contactado',   order: 2, color: '#3b82f6' },
  { id: 'propuesta',   name: 'Propuesta',    order: 3, color: '#f59e0b' },
  { id: 'negociacion', name: 'Negociación',  order: 4, color: '#f97316' },
  { id: 'ganado',      name: 'Ganado',       order: 5, color: '#22c55e' },
];

@Injectable()
export class PipelineService {
  constructor(
    @InjectModel(Pipeline.name) private pipelineModel: Model<PipelineDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
  ) {}

  async getOrCreateDefault(tenantId: string): Promise<Pipeline> {
    let pipeline = await this.pipelineModel.findOne({ tenantId, isDefault: true }).lean();
    if (!pipeline) {
      const created = await this.pipelineModel.create({
        tenantId,
        name: 'Pipeline de Ventas',
        stages: DEFAULT_STAGES,
        isDefault: true,
      });
      pipeline = created.toObject();
    }
    return pipeline;
  }

  async getKanban(tenantId: string) {
    const pipeline = await this.getOrCreateDefault(tenantId);
    const deals = await this.dealModel
      .find({ tenantId, pipelineId: (pipeline as any)._id, status: 'open' })
      .sort({ createdAt: -1 })
      .lean();

    const dealsByStage: Record<string, any[]> = {};
    for (const stage of pipeline.stages) {
      dealsByStage[stage.id] = deals.filter((d) => d.stageId === stage.id);
    }

    return { pipeline, dealsByStage };
  }

  async createDeal(dto: CreateDealDto) {
    return this.dealModel.create({
      ...dto,
      pipelineId: new Types.ObjectId(dto.pipelineId),
    });
  }

  async updateDeal(tenantId: string, dealId: string, dto: UpdateDealDto) {
    return this.dealModel
      .findOneAndUpdate({ _id: dealId, tenantId }, { $set: dto }, { new: true })
      .lean();
  }

  async moveDeal(tenantId: string, dealId: string, stageId: string) {
    return this.dealModel
      .findOneAndUpdate({ _id: dealId, tenantId }, { $set: { stageId } }, { new: true })
      .lean();
  }

  async deleteDeal(tenantId: string, dealId: string) {
    return this.dealModel.findOneAndDelete({ _id: dealId, tenantId });
  }

  /**
   * Crea automáticamente un Deal en la etapa "Nuevo Lead" cuando llega un
   * contacto nuevo. Idempotente: si ya existe un deal abierto para este
   * contacto en el pipeline por defecto, no crea uno nuevo.
   */
  async createDealForContact(
    tenantId: string,
    contactPhone: string,
    contactName: string,
    conversationId?: string,
  ) {
    const pipeline = await this.getOrCreateDefault(tenantId);
    const pipelineId = (pipeline as any)._id;

    const existing = await this.dealModel.findOne({
      tenantId,
      pipelineId,
      contactPhone,
      status: 'open',
    });
    if (existing) return existing;

    return this.dealModel.create({
      tenantId,
      pipelineId,
      stageId: 'nuevo_lead',
      contactPhone,
      contactName,
      title: `Lead ${contactName || contactPhone}`,
      conversationId: conversationId ?? '',
      status: 'open',
    });
  }

  /**
   * Mueve el Deal a la etapa "Ganado" y cambia su estado a 'won' cuando se
   * confirma una venta. Vincula el saleId en el Deal.
   */
  async markDealWon(
    tenantId: string,
    dealId: string,
    saleId: string,
  ) {
    return this.dealModel.findOneAndUpdate(
      { _id: dealId, tenantId },
      { $set: { stageId: 'ganado', status: 'won', saleId } },
      { new: true },
    );
  }

  /**
   * Busca el deal abierto más reciente de un contacto para vincular una venta.
   */
  async findOpenDealByContact(tenantId: string, contactPhone: string) {
    const pipeline = await this.getOrCreateDefault(tenantId);
    return this.dealModel
      .findOne({
        tenantId,
        pipelineId: (pipeline as any)._id,
        contactPhone,
        status: 'open',
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Avanza o cierra el deal abierto de un contacto.
   * Usado por la máquina de estados de ventas desde n8n.
   */
  async advanceDealByContact(
    tenantId: string,
    contactPhone: string,
    opts: { stageId?: string; status?: string; value?: number; saleId?: string },
  ) {
    const pipeline = await this.getOrCreateDefault(tenantId);
    const pipelineId = (pipeline as any)._id;
    const $set: any = {};
    if (opts.stageId) $set.stageId = opts.stageId;
    if (opts.status) $set.status = opts.status;
    if (opts.value !== undefined && opts.value !== null) $set.value = opts.value;
    if (opts.saleId) $set.saleId = opts.saleId;
    if (!Object.keys($set).length) return null;
    return this.dealModel
      .findOneAndUpdate(
        { tenantId, pipelineId, contactPhone, status: 'open' },
        { $set },
        { new: true, sort: { createdAt: -1 } },
      )
      .lean();
  }
}
