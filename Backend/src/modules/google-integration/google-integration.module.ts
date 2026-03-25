import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoogleIntegration, GoogleIntegrationSchema } from './google-integration.schema';
import { GoogleIntegrationService } from './google-integration.service';
import {
  GoogleIntegrationController,
  GoogleCallbackController,
  GoogleInternalController,
} from './google-integration.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GoogleIntegration.name, schema: GoogleIntegrationSchema },
    ]),
    TenantsModule,
  ],
  controllers: [
    GoogleIntegrationController,
    GoogleCallbackController,
    GoogleInternalController,
  ],
  providers: [GoogleIntegrationService],
  exports: [GoogleIntegrationService],
})
export class GoogleIntegrationModule {}
