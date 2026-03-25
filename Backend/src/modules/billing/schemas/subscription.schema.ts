import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionStatus = 'authorized' | 'pending' | 'paused' | 'cancelled' | 'free';

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription extends Document {
  @Prop({ required: true, unique: true })
  tenantId: string;

  // MercadoPago PreApproval ID (ID de la suscripcion del tenant en MP)
  @Prop({ default: null })
  mpPreapprovalId: string | null;

  // Email del pagador registrado en MP
  @Prop({ default: null })
  mpPayerEmail: string | null;

  // PreApprovalPlan ID de MP (PA-xxx)
  @Prop({ default: null })
  mpPlanId: string | null;

  // Nombre del plan SharkByte (pro, enterprise)
  @Prop({ default: null })
  planName: string | null;

  @Prop({
    required: true,
    enum: ['authorized', 'pending', 'paused', 'cancelled', 'free'],
    default: 'free',
  })
  status: SubscriptionStatus;

  @Prop({ type: Date, default: null })
  currentPeriodStart: Date | null;

  @Prop({ type: Date, default: null })
  currentPeriodEnd: Date | null;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;

  @Prop({ type: Date, default: null })
  canceledAt: Date | null;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ mpPreapprovalId: 1 });
// Consultas de billing por estado y por tenant+estado
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ planName: 1, status: 1 });
