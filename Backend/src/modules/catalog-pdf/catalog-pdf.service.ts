import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatalogPdf } from './schemas/catalog-pdf.schema';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class CatalogPdfService {
  constructor(
    @InjectModel(CatalogPdf.name) private pdfModel: Model<CatalogPdf>,
    private storageService: StorageService,
  ) {}

  async findByTenant(tenantId: string): Promise<CatalogPdf | null> {
    return this.pdfModel.findOne({ tenantId });
  }

  async upsert(tenantId: string, file: Express.Multer.File): Promise<CatalogPdf> {
    const existing = await this.pdfModel.findOne({ tenantId });

    // Eliminar PDF anterior si existe
    if (existing?.pdfKey) {
      await this.storageService.delete(existing.pdfKey);
    }

    const key = `tenants/${tenantId}/catalog/catalog.pdf`;
    const pdfUrl = await this.storageService.upload(key, file.buffer, 'application/pdf');

    if (existing) {
      existing.pdfUrl = pdfUrl;
      existing.pdfKey = key;
      existing.fileName = file.originalname;
      existing.fileSize = file.size;
      return existing.save();
    }

    return this.pdfModel.create({
      tenantId,
      pdfUrl,
      pdfKey: key,
      fileName: file.originalname,
      fileSize: file.size,
    });
  }

  async remove(tenantId: string): Promise<void> {
    const existing = await this.pdfModel.findOne({ tenantId });
    if (!existing) throw new NotFoundException('No hay PDF de catálogo para este tenant');

    if (existing.pdfKey) {
      await this.storageService.delete(existing.pdfKey);
    }

    await existing.deleteOne();
  }
}
