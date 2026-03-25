import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { UsageSnapshot, UsageSnapshotSchema } from './schemas/usage-snapshot.schema';
import { TenantsModule } from '../tenants/tenants.module';

// TenantsModule exporta MongooseModule que ya incluye el modelo Tenant
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsageSnapshot.name, schema: UsageSnapshotSchema },
    ]),
    TenantsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
