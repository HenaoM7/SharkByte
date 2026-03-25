import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'usage_snapshots' })
export class UsageSnapshot extends Document {
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  tenantName: string;

  @Prop({ required: true })
  planName: string;

  @Prop({ default: 0 })
  messagesUsed: number;

  @Prop({ default: 0 })
  tokensUsed: number;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  period: string; // '2025-01'

  @Prop({ default: true })
  isActive: boolean;
}

export const UsageSnapshotSchema = SchemaFactory.createForClass(UsageSnapshot);
UsageSnapshotSchema.index({ period: 1 });
UsageSnapshotSchema.index({ planName: 1 });
UsageSnapshotSchema.index({ tenantId: 1, period: 1 }, { unique: true });
