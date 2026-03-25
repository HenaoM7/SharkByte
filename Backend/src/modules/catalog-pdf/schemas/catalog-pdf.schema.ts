import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'catalog_pdfs' })
export class CatalogPdf extends Document {
  @Prop({ required: true, unique: true })
  tenantId: string;

  @Prop({ default: '' })
  pdfUrl: string;    // URL pública en DO Spaces

  @Prop({ default: '' })
  pdfKey: string;    // key en el bucket para poder eliminar

  @Prop({ default: '' })
  fileName: string;  // nombre original del archivo

  @Prop({ default: 0 })
  fileSize: number;  // tamaño en bytes
}

export const CatalogPdfSchema = SchemaFactory.createForClass(CatalogPdf);
