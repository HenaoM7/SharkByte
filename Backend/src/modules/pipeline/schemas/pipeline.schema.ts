import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PipelineDocument = Pipeline & Document;

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

@Schema({ timestamps: true, collection: 'pipelines' })
export class Pipeline {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ default: 'Pipeline de Ventas' })
  name: string;

  @Prop({ type: [Object], default: [] })
  stages: PipelineStage[];

  @Prop({ default: false })
  isDefault: boolean;
}

export const PipelineSchema = SchemaFactory.createForClass(Pipeline);
PipelineSchema.index({ tenantId: 1, isDefault: 1 });
