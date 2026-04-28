import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  contactPhone: string;

  @Prop({ default: '' })
  contactName: string;

  @Prop({ enum: ['whatsapp', 'facebook', 'instagram', 'telegram', 'tiktok'], default: 'whatsapp' })
  channel: string;

  @Prop({ enum: ['open', 'closed', 'escalated'], default: 'open' })
  status: string;

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ type: Date, default: null })
  lastMessageAt: Date;

  @Prop({ default: '' })
  assignedTo: string;

  @Prop({ enum: ['general', 'support', 'sales', 'inquiry', 'complaint'], default: 'general' })
  category: string;

  // Cross-entity links
  @Prop({ default: '' })
  dealId: string;

  @Prop({ default: '' })
  saleId: string;

  // Sales state machine
  @Prop({
    enum: ['browsing', 'interested', 'data_collected', 'payment_pending', 'payment_sent', 'payment_confirmed', 'completed'],
    default: 'browsing',
  })
  salesStage: string;

  @Prop({ type: Object, default: {} })
  salesData: Record<string, any>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ tenantId: 1, status: 1, lastMessageAt: -1 });
// Unique per canal: el mismo contactPhone puede existir en WhatsApp y en Facebook del mismo tenant
ConversationSchema.index({ tenantId: 1, contactPhone: 1, channel: 1 }, { unique: true });
