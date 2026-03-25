import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from './users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async findAll(query?: QueryUsersDto): Promise<PaginatedResult<any>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query?.search) {
      const q = query.search;
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { tenantId: { $regex: q, $options: 'i' } },
      ];
    }

    if (query?.role) filter.role = query.role;
    if (query?.isActive !== undefined) filter.isActive = query.isActive === 'true';

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (exists) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role ?? 'owner',
      tenantId: dto.tenantId ?? null,
      isActive: true,
    });

    return {
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.email) {
      const exists = await this.userModel.findOne({
        email: dto.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (exists) throw new ConflictException('El email ya está en uso');
      dto.email = dto.email.toLowerCase();
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .select('-passwordHash');
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async deactivate(id: string) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .select('-passwordHash');
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async activate(id: string) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .select('-passwordHash');
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
