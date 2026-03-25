import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule], // exports TenantsService (for OwnershipGuard) + Tenant model
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
