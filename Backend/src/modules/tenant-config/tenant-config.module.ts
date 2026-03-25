import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantConfig, TenantConfigSchema } from './tenant-config.schema';
import { TenantConfigService } from './tenant-config.service';
import { TenantConfigController } from './tenant-config.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { StorageService } from '../../common/services/storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TenantConfig.name, schema: TenantConfigSchema }]),
    TenantsModule,
  ],
  controllers: [TenantConfigController],
  providers: [TenantConfigService, StorageService],
  exports: [TenantConfigService],
})
export class TenantConfigModule {}
