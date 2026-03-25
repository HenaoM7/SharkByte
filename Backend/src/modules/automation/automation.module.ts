import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationEngineService } from './automation-engine.service';
import { AutomationRule, AutomationRuleSchema } from './schemas/automation-rule.schema';
import { Contact, ContactSchema } from '../contacts/schemas/contact.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AutomationRule.name, schema: AutomationRuleSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationEngineService],
  exports: [AutomationService, AutomationEngineService],
})
export class AutomationModule {}
