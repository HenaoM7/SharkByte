import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true, collection: 'contacts' })
export class Contact {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ enum: ['whatsapp', 'manual', 'import'], default: 'whatsapp' })
  source: string;

  @Prop({ default: '' })
  assignedTo: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ type: Date, default: null })
  lastInteractionAt: Date;

  // Lead qualification
  @Prop({ default: 0 })
  score: number;

  @Prop({
    type: String,
    enum: ['lead', 'prospect', 'customer', 'churned'],
    default: 'lead',
  })
  stage: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

ContactSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
ContactSchema.index({ tenantId: 1, tags: 1 });
ContactSchema.index({ tenantId: 1, lastInteractionAt: -1 });
