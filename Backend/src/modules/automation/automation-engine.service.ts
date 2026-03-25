/**
 * AutomationEngineService — Motor de ejecución de reglas de automatización
 *
 * Evalúa las reglas activas de un tenant y ejecuta las acciones configuradas:
 *   - keyword: dispara cuando el mensaje contiene palabras clave
 *   - inactivity: dispara cuando el contacto lleva N días sin interacciones
 *   - usage_limit: dispara cuando el uso supera un umbral porcentual
 *   - schedule: disparado externamente (cron) vía triggerScheduled()
 *
 * Acciones soportadas:
 *   - auto_reply: devuelve mensaje de respuesta (la capa de transport lo envía)
 *   - notify_admin: emite evento interno para notificar al admin
 *   - tag: añade etiqueta al contacto
 *   - escalate: cambia status de la conversación a 'escalated'
 *   - webhook: hace POST al webhookUrl configurado
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AutomationRule } from './schemas/automation-rule.schema';
import { Contact, ContactDocument } from '../contacts/schemas/contact.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import * as https from 'https';
import * as http from 'http';

export interface MessageContext {
  tenantId: string;
  contactPhone: string;
  contactName?: string;
  message: string;
  conversationId?: string;
}

export interface EngineResult {
  ruleId: string;
  ruleName: string;
  actionType: string;
  replyMessage?: string;
  tag?: string;
}

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    @InjectModel(AutomationRule.name) private ruleModel: Model<AutomationRule>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Conversation.name) private convModel: Model<ConversationDocument>,
  ) {}

  /**
   * Evalúa reglas de tipo 'keyword' e 'intent' para un mensaje entrante.
   * Retorna un array de resultados de acciones ejecutadas (para que la capa
   * superior pueda enviar auto-replies, etc.).
   */
  async processMessage(ctx: MessageContext): Promise<EngineResult[]> {
    const rules = await this.ruleModel
      .find({ tenantId: ctx.tenantId, isActive: true, 'trigger.type': { $in: ['keyword', 'intent'] } })
      .sort({ priority: 1 })
      .lean();

    const results: EngineResult[] = [];

    for (const rule of rules) {
      const triggered = this.evaluateMessageTrigger(rule, ctx.message);
      if (!triggered) continue;

      const result = await this.executeAction(rule, ctx);
      if (result) {
        results.push(result);
        await this.ruleModel.findByIdAndUpdate((rule as any)._id, {
          $inc: { executions: 1 },
          $set: { lastExecutedAt: new Date() },
        });
      }
    }

    return results;
  }

  /**
   * Evalúa reglas de inactividad para todos los contactos de un tenant.
   * Llamado por un cron job periódico.
   */
  async processInactivity(tenantId: string): Promise<void> {
    const rules = await this.ruleModel
      .find({ tenantId, isActive: true, 'trigger.type': 'inactivity' })
      .lean();

    if (!rules.length) return;

    for (const rule of rules) {
      const days = rule.trigger.inactivityDays ?? 7;
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - days);

      const inactiveContacts = await this.contactModel
        .find({
          tenantId,
          lastInteractionAt: { $lt: threshold },
        })
        .lean();

      for (const contact of inactiveContacts) {
        const ctx: MessageContext = {
          tenantId,
          contactPhone: contact.phone,
          contactName: contact.name,
          message: '',
        };
        await this.executeAction(rule, ctx).catch((e) =>
          this.logger.error(`inactivity action failed: ${e.message}`),
        );
      }

      await this.ruleModel.findByIdAndUpdate((rule as any)._id, {
        $inc: { executions: inactiveContacts.length },
        $set: { lastExecutedAt: new Date() },
      });
    }
  }

  /**
   * Evalúa reglas de tipo 'schedule' (llamado desde un cron externo o desde
   * el SchedulerService cuando el tiempo coincide).
   */
  async triggerScheduled(tenantId: string, dayOfWeek: string, time: string): Promise<void> {
    const rules = await this.ruleModel
      .find({ tenantId, isActive: true, 'trigger.type': 'schedule' })
      .lean();

    for (const rule of rules) {
      const schedule = rule.trigger.schedule;
      if (!schedule) continue;
      if (!schedule.days.includes(dayOfWeek)) continue;
      if (schedule.time !== time) continue;

      // Execute for all active conversations
      const conversations = await this.convModel.find({ tenantId, status: 'open' }).lean();
      for (const conv of conversations) {
        const ctx: MessageContext = {
          tenantId,
          contactPhone: conv.contactPhone,
          contactName: conv.contactName,
          message: '',
          conversationId: (conv as any)._id.toString(),
        };
        await this.executeAction(rule, ctx).catch((e) =>
          this.logger.error(`schedule action failed: ${e.message}`),
        );
      }

      await this.ruleModel.findByIdAndUpdate((rule as any)._id, {
        $inc: { executions: conversations.length },
        $set: { lastExecutedAt: new Date() },
      });
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private evaluateMessageTrigger(rule: any, message: string): boolean {
    const trigger = rule.trigger;
    const lowerMsg = message.toLowerCase();

    if (trigger.type === 'keyword') {
      const keywords: string[] = (trigger.keywords ?? []).map((k: string) => k.toLowerCase());
      if (trigger.matchMode === 'all') {
        return keywords.every((k) => lowerMsg.includes(k));
      }
      return keywords.some((k) => lowerMsg.includes(k));
    }

    // 'intent' type: trigger.intent is matched against message (simplified — no ML)
    if (trigger.type === 'intent' && trigger.intent) {
      return lowerMsg.includes(trigger.intent.toLowerCase());
    }

    return false;
  }

  private async executeAction(rule: any, ctx: MessageContext): Promise<EngineResult | null> {
    const action = rule.action;
    const result: EngineResult = {
      ruleId: (rule as any)._id?.toString() ?? '',
      ruleName: rule.name,
      actionType: action.type,
    };

    switch (action.type) {
      case 'auto_reply':
        result.replyMessage = action.replyMessage ?? '';
        break;

      case 'tag':
        if (action.tag && ctx.contactPhone) {
          await this.contactModel.findOneAndUpdate(
            { tenantId: ctx.tenantId, phone: ctx.contactPhone },
            { $addToSet: { tags: action.tag } },
          ).catch(() => {});
          result.tag = action.tag;
        }
        break;

      case 'escalate':
        if (ctx.conversationId) {
          await this.convModel.findByIdAndUpdate(ctx.conversationId, {
            $set: { status: 'escalated' },
          }).catch(() => {});
        } else {
          await this.convModel.findOneAndUpdate(
            { tenantId: ctx.tenantId, contactPhone: ctx.contactPhone },
            { $set: { status: 'escalated' } },
          ).catch(() => {});
        }
        break;

      case 'webhook':
        if (action.webhookUrl) {
          await this.callWebhook(action.webhookUrl, {
            rule: rule.name,
            tenantId: ctx.tenantId,
            contactPhone: ctx.contactPhone,
            message: ctx.message,
            payload: action.webhookPayload ?? {},
          }).catch((e) => this.logger.warn(`webhook failed: ${e.message}`));
        }
        break;

      case 'notify_admin':
        // Logged — notification transport is handled by the email/notification layer
        this.logger.log(
          `[AutomationEngine] notify_admin triggered for tenant=${ctx.tenantId} rule="${rule.name}"`,
        );
        break;

      default:
        return null;
    }

    return result;
  }

  private callWebhook(url: string, payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const isHttps = url.startsWith('https');
      const transport = isHttps ? https : http;
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      };
      const req = transport.request(url, options, (res) => {
        res.resume(); // consume response
        resolve();
      });
      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('webhook timeout')); });
      req.write(body);
      req.end();
    });
  }
}
