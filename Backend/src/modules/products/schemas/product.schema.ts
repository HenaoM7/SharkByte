import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'products' })
export class Product extends Document {
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  sku: string;

  @Prop({ default: '' })
  category: string;

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: null })
  comparePrice: number | null;   // precio tachado (precio original)

  @Prop({ default: null })
  stock: number | null;          // null = sin control de stock

  @Prop({ default: true })
  available: boolean;

  @Prop({ default: '' })
  imageUrl: string;              // URL pública en DO Spaces

  @Prop({ default: '' })
  imageKey: string;              // key en el bucket para poder eliminar

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ tenantId: 1, available: 1 });
ProductSchema.index({ tenantId: 1, category: 1 });
// Texto libre para búsqueda por nombre/descripción/sku/categoría
ProductSchema.index(
  { name: 'text', description: 'text', sku: 'text', category: 'text' },
  { weights: { name: 10, sku: 8, category: 5, description: 2 }, name: 'product_search' },
);
