import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SaleDocument = Sale & Document;

@Schema({ timestamps: true, collection: 'sales' })
export class Sale {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ default: '' })
  clientName: string;

  @Prop({ required: true })
  clientPhone: string;

  @Prop({ default: '' })
  productName: string;

  @Prop({ default: 1 })
  quantity: number;

  @Prop({ default: null })
  totalAmount: number | null;

  @Prop({ default: '' })
  paymentMessage: string;

  @Prop({ default: '' })
  deliveryAddress: string;

  @Prop({ default: '' })
  clientId: string; // Cédula / documento de identidad

  @Prop({ default: '' })
  productDetails: string; // Detalles completos del pedido (características, talla, color, etc.)

  @Prop({ default: '' })
  businessName: string;

  @Prop({
    type: String,
    enum: ['confirmed', 'pending', 'cancelled'],
    default: 'confirmed',
  })
  status: string;

  @Prop({ default: () => new Date() })
  confirmedAt: Date;

  @Prop({ default: false })
  recompraSent: boolean;

  @Prop({ default: null })
  recompraScheduledFor: Date | null;

  // Cross-entity links
  @Prop({ default: '' })
  conversationId: string;

  @Prop({ default: '' })
  dealId: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

SaleSchema.index({ tenantId: 1, confirmedAt: -1 });
SaleSchema.index({ tenantId: 1, status: 1 });
SaleSchema.index({ recompraSent: 1, recompraScheduledFor: 1, status: 1 });
