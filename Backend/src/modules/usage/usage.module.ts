import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsageService } from './usage.service';
import { UsageScheduler } from './usage.scheduler';
import { Tenant, TenantSchema } from '../tenants/tenants.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  providers: [UsageService, UsageScheduler],
  exports: [UsageService],
})
export class UsageModule {}
