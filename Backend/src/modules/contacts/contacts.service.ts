import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument } from './schemas/contact.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
  ) {}

  async findAll(
    tenantId: string,
    opts: { search?: string; tag?: string; page?: number; limit?: number },
  ) {
    const { search, tag, page = 1, limit = 20 } = opts;
    const filter: any = { tenantId };
    if (tag) filter.tags = tag;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.contactModel
        .find(filter)
        .sort({ lastInteractionAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.contactModel.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, contactId: string) {
    return this.contactModel.findOne({ _id: contactId, tenantId }).lean();
  }

  async create(dto: CreateContactDto): Promise<Contact> {
    const contact = new this.contactModel(dto);
    return contact.save();
  }

  async upsertByPhone(
    tenantId: string,
    phone: string,
    data: { name?: string; lastInteractionAt?: Date },
  ): Promise<Contact> {
    return this.contactModel
      .findOneAndUpdate(
        { tenantId, phone },
        {
          $set: {
            ...(data.name ? { name: data.name } : {}),
            lastInteractionAt: data.lastInteractionAt ?? new Date(),
          },
          $setOnInsert: { tenantId, phone, source: 'whatsapp' },
        },
        { upsert: true, new: true },
      )
      .lean();
  }

  async update(tenantId: string, contactId: string, dto: UpdateContactDto) {
    return this.contactModel
      .findOneAndUpdate({ _id: contactId, tenantId }, { $set: dto }, { new: true })
      .lean();
  }

  async remove(tenantId: string, contactId: string) {
    return this.contactModel.findOneAndDelete({ _id: contactId, tenantId });
  }
}
