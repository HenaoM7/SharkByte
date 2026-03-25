import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ timestamps: true, collection: 'tags' })
export class Tag {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '#6366f1' })
  color: string;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
TagSchema.index({ tenantId: 1, name: 1 }, { unique: true });
