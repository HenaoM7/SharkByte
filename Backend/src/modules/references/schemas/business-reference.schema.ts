import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'business_references' })
export class BusinessReference extends Document {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  name: string; // Nombre amigable, ej: "Tienda web principal"

  @Prop({ required: true, enum: ['web', 'api', 'document'] })
  type: string; // Tipo de fuente

  @Prop({ required: true })
  url: string; // URL o endpoint a consultar

  @Prop({ default: '' })
  description: string; // Para qué sirve esta referencia

  @Prop({ default: 'manual', enum: ['manual', 'hourly', 'daily', 'weekly'] })
  updateFrequency: string; // Con qué frecuencia n8n debe re-scrappear

  @Prop({ type: [String], default: [] })
  categories: string[]; // Categorías relacionadas (productos, precios, servicios, etc.)

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  lastFetched: Date | null; // Última vez que n8n actualizó el caché
}

export const BusinessReferenceSchema = SchemaFactory.createForClass(BusinessReference);
