import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InternalController } from './internal.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { UsageModule } from '../usage/usage.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { AutomationModule } from '../automation/automation.module';
import { ProductsModule } from '../products/products.module';
import { CatalogPdfModule } from '../catalog-pdf/catalog-pdf.module';
import { SalesModule } from '../sales/sales.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ReferencesModule } from '../references/references.module';
import { ChannelsModule } from '../channels/channels.module';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';

@Module({
  imports: [
    TenantsModule, UsageModule, TenantConfigModule, AutomationModule,
    ProductsModule, CatalogPdfModule, SalesModule, ConversationsModule, ReferencesModule, ChannelsModule,
    MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
  ],
  controllers: [InternalController],
})
export class InternalModule {}
