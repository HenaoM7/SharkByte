import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessReference, BusinessReferenceSchema } from './schemas/business-reference.schema';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BusinessReference.name, schema: BusinessReferenceSchema }]),
    TenantsModule,
  ],
  controllers: [ReferencesController],
  providers: [ReferencesService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
