import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from './schemas/tag.schema';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(@InjectModel(Tag.name) private tagModel: Model<TagDocument>) {}

  async findAll(tenantId: string) {
    return this.tagModel.find({ tenantId }).sort({ name: 1 }).lean();
  }

  async create(dto: CreateTagDto): Promise<Tag> {
    try {
      return await this.tagModel.create(dto);
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Ya existe un tag con ese nombre.');
      throw e;
    }
  }

  async remove(tenantId: string, tagId: string) {
    return this.tagModel.findOneAndDelete({ _id: tagId, tenantId });
  }
}
