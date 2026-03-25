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
    const [data, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments(filter),
    ]);
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

  async upsert(dto: UpsertConversationDto): Promise<{ conversation: any; message: any }> {
    const now = new Date();
    const snippet = (dto.message || '').substring(0, 100);

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

    let message: any = null;
    if (dto.message) {
      message = await this.messageModel.create({
        conversationId: conversation._id,
        tenantId: dto.tenantId,
        sender: dto.sender || 'client',
        content: dto.message,
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
