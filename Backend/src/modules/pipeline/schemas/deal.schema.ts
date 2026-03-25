import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DealDocument = Deal & Document;

@Schema({ timestamps: true, collection: 'deals' })
export class Deal {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: 'Pipeline', required: true })
  pipelineId: Types.ObjectId;

  @Prop({ required: true })
  stageId: string;

  @Prop({ default: '' })
  contactPhone: string;

  @Prop({ default: '' })
  contactName: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: 0 })
  value: number;

  @Prop({ default: 'COP' })
  currency: string;

  @Prop({ enum: ['open', 'won', 'lost'], default: 'open' })
  status: string;

  @Prop({ default: '' })
  assignedTo: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ type: Date, default: null })
  expectedCloseDate: Date;

  // Cross-entity links
  @Prop({ default: '' })
  saleId: string;

  @Prop({ default: '' })
  conversationId: string;
}

export const DealSchema = SchemaFactory.createForClass(Deal);
DealSchema.index({ tenantId: 1, pipelineId: 1, stageId: 1 });
DealSchema.index({ tenantId: 1, status: 1 });
