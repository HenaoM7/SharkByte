import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogPdfController } from './catalog-pdf.controller';
import { CatalogPdfService } from './catalog-pdf.service';
import { CatalogPdf, CatalogPdfSchema } from './schemas/catalog-pdf.schema';
import { StorageService } from '../../common/services/storage.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CatalogPdf.name, schema: CatalogPdfSchema }]),
    TenantsModule,
  ],
  controllers: [CatalogPdfController],
  providers: [CatalogPdfService, StorageService],
  exports: [CatalogPdfService],
})
export class CatalogPdfModule {}
