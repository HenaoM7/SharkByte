import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { InternalModule } from './modules/internal/internal.module';
import { PlansModule } from './modules/plans/plans.module';
import { UsageModule } from './modules/usage/usage.module';
import { TenantConfigModule } from './modules/tenant-config/tenant-config.module';
import { UsersModule } from './modules/users/users.module';
import { BillingModule } from './modules/billing/billing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AutomationModule } from './modules/automation/automation.module';
import { ProductsModule } from './modules/products/products.module';
import { CatalogPdfModule } from './modules/catalog-pdf/catalog-pdf.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { SalesModule } from './modules/sales/sales.module';
import { GoogleIntegrationModule } from './modules/google-integration/google-integration.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { TagsModule } from './modules/tags/tags.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ReferencesModule } from './modules/references/references.module';
import { ChannelsModule } from './modules/channels/channels.module';

@Module({
  imports: [
    // Config global — lee .env automáticamente
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB
    // MongoDB — Atlas M10 connection pool profesional
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        // Pool: M10 soporta ~1500 conexiones; 10 por instancia PM2 es seguro
        maxPoolSize: 10,
        minPoolSize: 2,
        // Timeouts: evitar conexiones colgadas
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        // Heartbeat para detectar nodos caídos en replica set
        heartbeatFrequencyMS: 10000,
      }),
    }),

    // Rate Limiting global: 100 requests por 60 segundos por IP
    // Endpoints específicos pueden sobreescribir con @Throttle()
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,   // ventana de 60 segundos
        limit: 100,     // máximo 100 requests por ventana
      },
      {
        name: 'strict',
        ttl: 60_000,   // ventana de 60 segundos
        limit: 10,      // 10 requests — para auth endpoints sensibles
      },
    ]),

    // Scheduler para el reset mensual de uso (día 1 de cada mes)
    ScheduleModule.forRoot(),

    // PlansModule primero — TenantsModule depende de él
    PlansModule,
    UsageModule,
    AuthModule,
    TenantsModule,
    TenantConfigModule,
    UsersModule,
    AutomationModule,
    ProductsModule,
    CatalogPdfModule,
    BillingModule,
    AnalyticsModule,
    WhatsAppModule,
    SalesModule,
    GoogleIntegrationModule,
    ContactsModule,
    ConversationsModule,
    PipelineModule,
    TagsModule,
    AppointmentsModule,
    ReferencesModule,
    ChannelsModule,
    InternalModule,
  ],
  providers: [
    // ThrottlerGuard global — aplica a todos los endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
