import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'plans' })
export class Plan extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: -1 })
  maxMessages: number;

  @Prop({ default: -1 })
  maxTokens: number;

  @Prop({ default: 0 })
  price: number;

  // MercadoPago PreApprovalPlan ID — cacheado despues del primer checkout
  @Prop({ default: null })
  mpPlanId: string | null;

  // URL de checkout de MercadoPago para el plan (init_point del PreApprovalPlan)
  @Prop({ default: null })
  mpInitPoint: string | null;

  @Prop({ default: 'monthly', enum: ['monthly', 'annual'] })
  billingPeriod: string;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
