import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantConfig } from './tenant-config.schema';
import { UpsertTenantConfigDto } from './dto/upsert-tenant-config.dto';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class TenantConfigService {
  constructor(
    @InjectModel(TenantConfig.name) private configModel: Model<TenantConfig>,
    private storageService: StorageService,
  ) {}

  async findByTenantId(tenantId: string): Promise<TenantConfig | null> {
    return this.configModel.findOne({ tenantId }).exec();
  }

  async upsert(tenantId: string, dto: UpsertTenantConfigDto): Promise<TenantConfig> {
    const existing = await this.configModel.findOne({ tenantId });

    if (existing) {
      // Preserve qrImageUrl: never overwrite a stored URL with an empty value
      if (dto.paymentConfig !== undefined && !dto.paymentConfig.qrImageUrl && existing.paymentConfig?.qrImageUrl) {
        dto.paymentConfig.qrImageUrl = existing.paymentConfig.qrImageUrl;
      }
      // Merge and increment version
      Object.assign(existing, dto, { version: existing.version + 1 });
      // Mixed-type fields require explicit markModified for Mongoose change detection
      if (dto.businessHours !== undefined) existing.markModified('businessHours');
      if (dto.automations !== undefined) existing.markModified('automations');
      if (dto.paymentConfig !== undefined) existing.markModified('paymentConfig');
      if (dto.autoResponses !== undefined) existing.markModified('autoResponses');
      if (dto.catalog !== undefined) existing.markModified('catalog');
      if (dto.faq !== undefined) existing.markModified('faq');
      if (dto.salesConfig !== undefined) existing.markModified('salesConfig');
      if (dto.businessAddress !== undefined) existing.markModified('businessAddress');
      if (dto.appointmentConfig !== undefined) existing.markModified('appointmentConfig');
      existing.isComplete = this.checkIsComplete(existing);
      return existing.save();
    }

    const config = await this.configModel.create({
      tenantId,
      ...dto,
      version: 1,
    });

    // Recheck after creation
    config.isComplete = this.checkIsComplete(config);
    return config.save();
  }

  async uploadPaymentQr(tenantId: string, file: Express.Multer.File): Promise<{ qrImageUrl: string }> {
    const key = `tenants/${tenantId}/payment/qr.png`;
    const qrImageUrl = await this.storageService.upload(key, file.buffer, file.mimetype || 'image/png');

    const existing = await this.configModel.findOne({ tenantId });
    if (existing) {
      const currentPaymentConfig = existing.paymentConfig ?? {};
      existing.paymentConfig = { ...currentPaymentConfig, qrImageUrl } as any;
      existing.markModified('paymentConfig');
      await existing.save();
    } else {
      await this.configModel.create({
        tenantId,
        paymentConfig: { qrImageUrl },
        version: 1,
      });
    }

    return { qrImageUrl };
  }

  // Config is considered complete when it has the minimum required fields
  private checkIsComplete(config: TenantConfig): boolean {
    return !!(
      config.welcomeMessage &&
      config.businessHours?.schedule?.length > 0 &&
      config.aiInstructions
    );
  }
}
