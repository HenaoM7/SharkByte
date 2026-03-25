import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ enum: ['client', 'bot', 'agent'], default: 'bot' })
  sender: string;

  @Prop({ default: '' })
  content: string;

  @Prop({ enum: ['text', 'image', 'audio', 'document'], default: 'text' })
  type: string;

  @Prop({ default: '' })
  mediaUrl: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ tenantId: 1, createdAt: -1 });
