import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BusinessReference } from './schemas/business-reference.schema';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/reference.dto';

@Injectable()
export class ReferencesService {
  constructor(
    @InjectModel(BusinessReference.name)
    private referenceModel: Model<BusinessReference>,
  ) {}

  async findAll(tenantId: string): Promise<any[]> {
    return this.referenceModel.find({ tenantId }).sort({ createdAt: -1 }).lean();
  }

  async findActive(tenantId: string): Promise<any[]> {
    return this.referenceModel.find({ tenantId, isActive: true }).sort({ createdAt: -1 }).lean();
  }

  async create(tenantId: string, dto: CreateReferenceDto): Promise<BusinessReference> {
    return this.referenceModel.create({ tenantId, ...dto, isActive: dto.isActive ?? true });
  }

  async update(tenantId: string, id: string, dto: UpdateReferenceDto): Promise<BusinessReference> {
    const ref = await this.referenceModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: dto },
      { new: true },
    );
    if (!ref) throw new NotFoundException('Referencia no encontrada');
    return ref;
  }

  async markFetched(tenantId: string, id: string): Promise<void> {
    await this.referenceModel.updateOne({ _id: id, tenantId }, { lastFetched: new Date() });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.referenceModel.deleteOne({ _id: id, tenantId });
    if (result.deletedCount === 0) throw new NotFoundException('Referencia no encontrada');
  }
}
