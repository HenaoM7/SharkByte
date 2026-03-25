import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TriggerType = 'keyword' | 'intent' | 'schedule' | 'usage_limit' | 'inactivity';
export type ActionType = 'auto_reply' | 'notify_admin' | 'tag' | 'escalate' | 'webhook';

class TriggerConfig {
  type: TriggerType;
  // keyword
  keywords?: string[];
  matchMode?: 'any' | 'all';
  // intent (clasificado por GPT-4o en el router)
  intent?: string;
  // schedule
  schedule?: { days: string[]; time: string };
  // usage_limit
  usagePercent?: number;
  // inactivity
  inactivityDays?: number;
}

class ActionConfig {
  type: ActionType;
  replyMessage?: string;
  notifyEmail?: string;
  tag?: string;
  webhookUrl?: string;
  webhookPayload?: Record<string, any>;
}

@Schema({ timestamps: true, collection: 'automation_rules' })
export class AutomationRule extends Document {
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: Object, required: true })
  trigger: TriggerConfig;

  @Prop({ type: Object, required: true })
  action: ActionConfig;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 1 })
  priority: number;

  @Prop({ default: 0 })
  executions: number;

  @Prop({ type: Date, default: null })
  lastExecutedAt: Date | null;
}

export const AutomationRuleSchema = SchemaFactory.createForClass(AutomationRule);
// Compound index cubre consultas por tenantId y por tenantId+isActive
AutomationRuleSchema.index({ tenantId: 1, isActive: 1 });
AutomationRuleSchema.index({ isActive: 1 });
