import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter } from 'events';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { UpsertConversationDto } from './dto/upsert-conversation.dto';
import { PipelineService } from '../pipeline/pipeline.service';

// Global emitter — used for SSE push to frontend
export const conversationEmitter = new EventEmitter();
conversationEmitter.setMaxListeners(100);

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name) private convModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private pipelineService: PipelineService,
  ) {}

  async findAll(
    tenantId: string,
    opts: { status?: string; page?: number; limit?: number },
  ) {
    const { status, page = 1, limit = 30 } = opts;
    const filter: any = { tenantId };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.convModel
        .find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.convModel.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getMessages(
    conversationId: string,
    opts: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 50 } = opts;
    const skip = (page - 1) * limit;
    const filter = { conversationId: new Types.ObjectId(conversationId) };
    const total = await this.messageModel.countDocuments(filter);
    // Fetch latest `limit` messages sorted desc, then reverse for chronological display
    const data = await this.messageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .then((msgs) => msgs.reverse());
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async assign(conversationId: string, tenantId: string, assignedTo: string) {
    return this.convModel
      .findOneAndUpdate(
        { _id: conversationId, tenantId },
        { $set: { assignedTo } },
        { new: true },
      )
      .lean();
  }

  async updateStatus(conversationId: string, tenantId: string, status: string) {
    return this.convModel
      .findOneAndUpdate(
        { _id: conversationId, tenantId },
        { $set: { status } },
        { new: true },
      )
      .lean();
  }

  async updateCategory(conversationId: string, tenantId: string, category: string) {
    return this.convModel
      .findOneAndUpdate(
        { _id: conversationId, tenantId },
        { $set: { category } },
        { new: true },
      )
      .lean();
  }

  // ── Sales State Machine ──────────────────────────────────────────────────────

  async getSalesState(
    tenantId: string,
    contactPhone: string,
    platform: string,
    messageLimit = 10,
  ) {
    const channel = platform || 'whatsapp';
    const conv = await this.convModel.findOne({ tenantId, contactPhone, channel }).lean();
    if (!conv) {
      return {
        found: false,
        conversationId: null,
        salesStage: 'browsing',
        salesData: {},
        dealId: '',
        category: 'sales',
        messages: [],
      };
    }
    const messages = await this.messageModel
      .find({ conversationId: (conv as any)._id })
      .sort({ createdAt: -1 })
      .limit(messageLimit)
      .lean()
      .then((msgs) => msgs.reverse());

    return {
      found: true,
      conversationId: (conv as any)._id.toString(),
      salesStage: (conv as any).salesStage || 'browsing',
      salesData: (conv as any).salesData || {},
      dealId: (conv as any).dealId || '',
      category: (conv as any).category || 'sales',
      messages: messages.map((m) => ({
        sender: m.sender,
        content: m.content,
        type: m.type,
        mediaUrl: m.mediaUrl,
        createdAt: (m as any).createdAt,
      })),
    };
  }

  async updateSalesState(
    tenantId: string,
    contactPhone: string,
    platform: string,
    salesStage: string,
    salesData?: Record<string, any>,
    extra?: { category?: string; dealId?: string },
  ) {
    const channel = platform || 'whatsapp';
    const $set: any = { salesStage };
    if (extra?.category) $set.category = extra.category;
    if (extra?.dealId) $set.dealId = extra.dealId;

    if (salesData && Object.keys(salesData).length > 0) {
      Object.entries(salesData).forEach(([k, v]) => {
        $set[`salesData.${k}`] = v;
      });
    }

    return this.convModel
      .findOneAndUpdate({ tenantId, contactPhone, channel }, { $set }, { new: true })
      .lean();
  }

  async advanceDeal(
    tenantId: string,
    contactPhone: string,
    opts: { stageId?: string; status?: string; value?: number; saleId?: string },
  ) {
    return this.pipelineService.advanceDealByContact(tenantId, contactPhone, opts);
  }

  async upsert(dto: UpsertConversationDto): Promise<{ conversation: any; message: any }> {
    const now = new Date();
    const TYPE_LABEL: Record<string, string> = { image: '[Imagen]', audio: '[Audio]', document: '[Documento]' };
    const snippet = dto.message?.substring(0, 100) || TYPE_LABEL[dto.type || ''] || '';

    const channel = dto.platform ?? 'whatsapp';
    const conversation = await this.convModel.findOneAndUpdate(
      { tenantId: dto.tenantId, contactPhone: dto.contactPhone, channel },
      {
        $set: {
          ...(dto.contactName ? { contactName: dto.contactName } : {}),
          lastMessage: snippet,
          lastMessageAt: now,
          status: 'open',
        },
        $setOnInsert: {
          tenantId: dto.tenantId,
          contactPhone: dto.contactPhone,
          channel: dto.platform ?? 'whatsapp',
        },
      },
      { upsert: true, new: true },
    );

    // Save message when there is text content OR when there is media (image/audio/document)
    const hasContent = !!(dto.message || (dto.mediaUrl && dto.type && dto.type !== 'text'));
    let message: any = null;
    if (hasContent) {
      message = await this.messageModel.create({
        conversationId: conversation._id,
        tenantId: dto.tenantId,
        sender: dto.sender || 'client',
        content: dto.message || '',
        type: dto.type || 'text',
        mediaUrl: dto.mediaUrl || '',
      });
    }

    // Fire-and-forget: auto-create deal in pipeline for new contacts
    this.pipelineService
      .createDealForContact(
        dto.tenantId,
        dto.contactPhone,
        conversation.contactName || dto.contactPhone,
        conversation._id.toString(),
      )
      .catch(() => {});

    // Emit SSE event
    conversationEmitter.emit('new_message', {
      tenantId: dto.tenantId,
      conversationId: conversation._id.toString(),
      contactPhone: dto.contactPhone,
      contactName: conversation.contactName,
      lastMessage: snippet,
      lastMessageAt: now,
      message,
    });

    return { conversation, message };
  }
}
