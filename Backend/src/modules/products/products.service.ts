import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    private storageService: StorageService,
  ) {}

  async findAll(tenantId: string, query: { search?: string; category?: string; available?: string; page?: number; limit?: number }) {
    const filter: any = { tenantId };

    if (query.available === 'true') filter.available = true;
    if (query.available === 'false') filter.available = false;
    if (query.category) filter.category = query.category;

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.productModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      this.productModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(tenantId: string, dto: CreateProductDto, imageFile?: Express.Multer.File): Promise<Product> {
    const product = await this.productModel.create({ tenantId, ...dto });

    if (imageFile) {
      const key = `tenants/${tenantId}/products/${product._id}.${this.ext(imageFile.mimetype)}`;
      const imageUrl = await this.storageService.upload(key, imageFile.buffer, imageFile.mimetype);
      if (imageUrl) {
        product.imageUrl = imageUrl;
        product.imageKey = key;
        await product.save();
      }
    }

    return product;
  }

  async update(id: string, tenantId: string, dto: Partial<CreateProductDto>, imageFile?: Express.Multer.File): Promise<Product> {
    const product = await this.productModel.findOne({ _id: id, tenantId });
    if (!product) throw new NotFoundException('Producto no encontrado');

    Object.assign(product, dto);

    if (imageFile) {
      if (product.imageKey) {
        await this.storageService.delete(product.imageKey);
      }
      const key = `tenants/${tenantId}/products/${product._id}.${this.ext(imageFile.mimetype)}`;
      const imageUrl = await this.storageService.upload(key, imageFile.buffer, imageFile.mimetype);
      if (imageUrl) {
        product.imageUrl = imageUrl;
        product.imageKey = key;
      }
    }

    return product.save();
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const product = await this.productModel.findOne({ _id: id, tenantId });
    if (!product) throw new NotFoundException('Producto no encontrado');

    if (product.imageKey) {
      await this.storageService.delete(product.imageKey);
    }

    await product.deleteOne();
  }

  /** Búsqueda para n8n — devuelve productos disponibles que coincidan con la query */
  async search(tenantId: string, query: string, limit = 5) {
    const filter: any = { tenantId, available: true };
    const hasQuery = !!query?.trim();
    if (hasQuery) filter.$text = { $search: query };
    return this.productModel
      .find(filter)
      .select('name description price comparePrice category sku imageUrl tags stock available')
      .sort(hasQuery ? { score: { $meta: 'textScore' } } : { name: 1 })
      .limit(limit)
      .lean();
  }

  /** Devuelve categorías únicas del tenant */
  async getCategories(tenantId: string): Promise<string[]> {
    const cats = await this.productModel.distinct('category', { tenantId, category: { $ne: '' } });
    return cats.sort();
  }

  private ext(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return map[mimeType] || 'jpg';
  }
}
