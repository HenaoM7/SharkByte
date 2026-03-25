import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

class TenantConfig {
  aiPrompt?: string;
  greeting?: string;
  outOfHoursMsg?: string;
  language?: string;
  aiModel?: string;
  schedule?: {
    timezone: string;
    days: string[];
    openTime: string;
    closeTime: string;
  };
  customRules?: Array<{ trigger: string; action: string }>;
}

class EvolutionInstance {
  instanceName?: string;
  status?: string; // connected | disconnected | pending
  phoneConnected?: string;
  apiUrl?: string;  // URL base del servidor Evolution API del tenant
  apiKey?: string;  // API key del servidor Evolution API del tenant
}

class GoogleCredentials {
  enabled?: boolean;       // false = integración desactivada
  clientEmail?: string;    // email del service account
  privateKey?: string;     // PEM key (los \n se almacenan como literales)
  spreadsheetId?: string;  // ID del spreadsheet (de la URL)
  sheetName?: string;      // pestaña dentro del spreadsheet — default 'Citas'
  calendarId?: string;     // ID del calendario — default 'primary'
}

export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'trial' | 'cancelled';

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant extends Document {
  @Prop({ required: true, unique: true })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
  plan: Types.ObjectId;

  // Estado granular del tenant
  @Prop({
    required: true,
    enum: ['active', 'inactive', 'suspended', 'trial', 'cancelled'],
    default: 'inactive',
  })
  status: TenantStatus;

  // Mantener isActive por compatibilidad con n8n / internal API
  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  config: TenantConfig;

  @Prop({ type: Object, default: {} })
  evolutionInstance: EvolutionInstance;

  @Prop({ type: Object, default: {} })
  googleCredentials: GoogleCredentials;

  @Prop({ default: 0 })
  messagesUsed: number;

  @Prop({ default: 0 })
  tokensUsed: number;

  @Prop({ type: Date, default: () => new Date() })
  usageResetAt: Date;

  // Vincula el tenant al user owner (_id como string)
  @Prop({ type: String, index: true })
  userId?: string;

  // Soft delete — deletedAt !== null indica que fue eliminado
  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

TenantSchema.index({ 'evolutionInstance.instanceName': 1 });
TenantSchema.index({ status: 1 });
TenantSchema.index({ deletedAt: 1 });
// Búsqueda por email en dashboard admin
TenantSchema.index({ email: 1 });
// Dashboard: tenants activos filtrados por plan
TenantSchema.index({ isActive: 1, status: 1 });
// Soft-delete compuesto: deletedAt: null + status
TenantSchema.index({ deletedAt: 1, status: 1 });
