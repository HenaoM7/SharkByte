import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'google_integrations' })
export class GoogleIntegration extends Document {
  @Prop({ required: true, unique: true, index: true })
  tenantId: string;

  @Prop()
  googleEmail: string;

  /** AES-256-CBC encrypted: iv:ciphertext */
  @Prop()
  accessToken: string;

  /** AES-256-CBC encrypted: iv:ciphertext */
  @Prop()
  refreshToken: string;

  @Prop()
  tokenExpiry: Date;

  @Prop({ default: 'primary' })
  calendarId: string;

  @Prop()
  spreadsheetId: string;

  @Prop()
  spreadsheetUrl: string;

  @Prop({ default: false })
  isConnected: boolean;

  @Prop()
  connectedAt: Date;
}

export const GoogleIntegrationSchema = SchemaFactory.createForClass(GoogleIntegration);
