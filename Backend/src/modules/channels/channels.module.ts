import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelConfig, ChannelConfigSchema } from './schemas/channel-config.schema';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { ChannelWebhooksController } from './channel-webhooks.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChannelConfig.name, schema: ChannelConfigSchema },
    ]),
    TenantsModule,
  ],
  controllers: [ChannelsController, ChannelWebhooksController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
