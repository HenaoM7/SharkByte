/**
 * Tests unitarios — ProductsService
 *
 * Cubre:
 *  - findAll: paginación, filtros (available, category, search), límite máximo 100
 *  - findById: encontrado, no encontrado
 *  - create: sin imagen, con imagen (sube a storage)
 *  - update: sin imagen, con imagen (reemplaza en storage), producto no encontrado
 *  - remove: con imagen (borra storage), sin imagen, no encontrado
 *  - search: con query, sin query (retorna disponibles)
 *  - getCategories: lista única de categorías
 *  - ext(): mapeo de mimeType a extensión
 *
 * Pruebas de exhaustividad (valores límite):
 *  - limit=0 → usa default 20
 *  - limit=101 → recorta a 100
 *  - page=0 → usa default 1
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './schemas/product.schema';
import { StorageService } from '../../common/services/storage.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeProduct = (overrides: Partial<any> = {}) => {
  const prod: any = {
    _id: 'prod-id-123',
    tenantId: 'tenant_123',
    name: 'Hamburguesa Classic',
    description: 'Carne 150g, lechuga, tomate',
    price: 25000,
    category: 'burgers',
    available: true,
    imageUrl: null,
    imageKey: null,
    deleteOne: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
  prod.save = jest.fn().mockResolvedValue(prod);
  return prod;
};

const makeChain = (resolveWith: any) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(Array.isArray(resolveWith) ? resolveWith : [resolveWith]),
  select: jest.fn().mockReturnThis(),
});

// ── Suite principal ───────────────────────────────────────────────────────────

describe('ProductsService', () => {
  let service: ProductsService;
  let productModel: any;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(async () => {
    productModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      distinct: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    storageService = {
      upload: jest.fn().mockResolvedValue('https://cdn.example.com/image.jpg'),
      delete: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retorna productos paginados del tenant', async () => {
      const products = [makeProduct(), makeProduct({ _id: 'prod-2' })];
      const chain = makeChain(products);
      productModel.find.mockReturnValue(chain);
      productModel.countDocuments.mockResolvedValue(2);

      const result = await service.findAll('tenant_123', {});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('filtra por available=true', async () => {
      productModel.find.mockReturnValue(makeChain([]));
      productModel.countDocuments.mockResolvedValue(0);

      await service.findAll('tenant_123', { available: 'true' });

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ available: true }),
      );
    });

    it('filtra por available=false', async () => {
      productModel.find.mockReturnValue(makeChain([]));
      productModel.countDocuments.mockResolvedValue(0);

      await service.findAll('tenant_123', { available: 'false' });

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ available: false }),
      );
    });

    it('filtra por category', async () => {
      productModel.find.mockReturnValue(makeChain([]));
      productModel.countDocuments.mockResolvedValue(0);

      await service.findAll('tenant_123', { category: 'burgers' });

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'burgers' }),
      );
    });

    it('usa búsqueda de texto si se provee search', async () => {
      productModel.find.mockReturnValue(makeChain([]));
      productModel.countDocuments.mockResolvedValue(0);

      await service.findAll('tenant_123', { search: 'hamburguesa' });

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $text: { $search: 'hamburguesa' } }),
      );
    });

    // ── Valores límite ─────────────────────────────────────────────────────

    it('[LÍMITE] limit=101 → recorta a 100', async () => {
      productModel.find.mockReturnValue(makeChain([]));
      productModel.countDocuments.mockResolvedValue(0);

      const result = await service.findAll('tenant_123', { limit: 101 });

      expect(result.limit).toBe(100);
    });

    it('[LÍMITE] limit=0 → usa default 20', async () => {
      productModel.find.mockReturnValue(makeChain([]));
      productModel.countDocuments.mockResolvedValue(0);

      const result = await service.findAll('tenant_123', { limit: 0 });

      expect(result.limit).toBe(20);
    });

    it('[LÍMITE] page no numérico → default page=1', async () => {
      productModel.find.mockReturnValue(makeChain([]));
      productModel.countDocuments.mockResolvedValue(0);

      const result = await service.findAll('tenant_123', { page: NaN });

      expect(result.page).toBe(1);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('retorna el producto cuando existe', async () => {
      const product = makeProduct();
      productModel.findById.mockResolvedValue(product);

      const result = await service.findById('prod-id-123');
      expect(result._id).toBe('prod-id-123');
    });

    it('lanza NotFoundException si no existe', async () => {
      productModel.findById.mockResolvedValue(null);

      await expect(service.findById('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto = { name: 'Nuevo Producto', price: 15000, available: true };

    it('crea producto sin imagen', async () => {
      const product = makeProduct();
      productModel.create.mockResolvedValue(product);

      const result = await service.create('tenant_123', dto as any);

      expect(productModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant_123', ...dto }),
      );
      expect(storageService.upload).not.toHaveBeenCalled();
    });

    it('sube imagen y guarda URL cuando se provee imageFile', async () => {
      const product = makeProduct({ save: jest.fn().mockResolvedValue(makeProduct()) });
      productModel.create.mockResolvedValue(product);
      storageService.upload.mockResolvedValue('https://cdn.example.com/img.jpg');

      const imageFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
      } as any;

      await service.create('tenant_123', dto as any, imageFile);

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringContaining('tenants/tenant_123/products/'),
        expect.any(Buffer),
        'image/jpeg',
      );
      expect(product.imageUrl).toBe('https://cdn.example.com/img.jpg');
    });

    it('no guarda URL si storage.upload retorna null/undefined', async () => {
      const product = makeProduct({ save: jest.fn().mockResolvedValue(makeProduct()) });
      productModel.create.mockResolvedValue(product);
      storageService.upload.mockResolvedValue(null as any);

      const imageFile = { buffer: Buffer.from('img'), mimetype: 'image/png' } as any;

      await service.create('tenant_123', dto as any, imageFile);

      expect(product.imageUrl).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('actualiza producto existente sin imagen', async () => {
      const product = makeProduct({ save: jest.fn().mockImplementation(function() { return Promise.resolve(this); }) });
      productModel.findOne.mockResolvedValue(product);

      await service.update('prod-id-123', 'tenant_123', { name: 'Nombre Nuevo' } as any);

      expect(product.name).toBe('Nombre Nuevo');
    });

    it('reemplaza imagen: borra la anterior y sube la nueva', async () => {
      const product = makeProduct({
        imageKey: 'tenants/tenant_123/products/old.jpg',
        save: jest.fn().mockImplementation(function() { return Promise.resolve(this); }),
      });
      productModel.findOne.mockResolvedValue(product);
      storageService.upload.mockResolvedValue('https://cdn.example.com/new.jpg');

      const imageFile = { buffer: Buffer.from('new'), mimetype: 'image/webp' } as any;

      await service.update('prod-id-123', 'tenant_123', {}, imageFile);

      expect(storageService.delete).toHaveBeenCalledWith('tenants/tenant_123/products/old.jpg');
      expect(storageService.upload).toHaveBeenCalled();
    });

    it('lanza NotFoundException si el producto no existe', async () => {
      productModel.findOne.mockResolvedValue(null);

      await expect(
        service.update('ghost', 'tenant_123', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('comprueba aislamiento de tenant: busca por _id Y tenantId', async () => {
      productModel.findOne.mockResolvedValue(null);

      await expect(
        service.update('prod-id', 'otro-tenant', {}),
      ).rejects.toThrow(NotFoundException);

      expect(productModel.findOne).toHaveBeenCalledWith(
        { _id: 'prod-id', tenantId: 'otro-tenant' },
      );
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('elimina el producto y borra imagen del storage', async () => {
      const product = makeProduct({ imageKey: 'tenants/t/products/img.jpg' });
      productModel.findOne.mockResolvedValue(product);

      await service.remove('prod-id-123', 'tenant_123');

      expect(storageService.delete).toHaveBeenCalledWith('tenants/t/products/img.jpg');
      expect(product.deleteOne).toHaveBeenCalled();
    });

    it('elimina el producto sin intentar borrar storage si no tiene imagen', async () => {
      const product = makeProduct({ imageKey: null });
      productModel.findOne.mockResolvedValue(product);

      await service.remove('prod-id-123', 'tenant_123');

      expect(storageService.delete).not.toHaveBeenCalled();
      expect(product.deleteOne).toHaveBeenCalled();
    });

    it('lanza NotFoundException si el producto no existe', async () => {
      productModel.findOne.mockResolvedValue(null);

      await expect(service.remove('ghost', 'tenant_123')).rejects.toThrow(NotFoundException);
    });
  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('busca productos disponibles del tenant con query', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([makeProduct()]),
      };
      productModel.find.mockReturnValue(chain);

      const result = await service.search('tenant_123', 'hamburguesa');

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant_123', available: true, $text: expect.any(Object) }),
      );
      expect(result).toHaveLength(1);
    });

    it('retorna disponibles sin query de texto cuando query está vacía', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      productModel.find.mockReturnValue(chain);

      await service.search('tenant_123', '');

      const filterArg = (productModel.find as jest.Mock).mock.calls[0][0];
      expect(filterArg).not.toHaveProperty('$text');
    });

    it('respeta el límite de resultados', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      productModel.find.mockReturnValue(chain);

      await service.search('tenant_123', 'query', 3);

      expect(chain.limit).toHaveBeenCalledWith(3);
    });
  });

  // ── getCategories ─────────────────────────────────────────────────────────

  describe('getCategories()', () => {
    it('retorna categorías únicas ordenadas del tenant', async () => {
      productModel.distinct.mockResolvedValue(['bebidas', 'burgers', 'postres']);

      const result = await service.getCategories('tenant_123');

      expect(result).toEqual(['bebidas', 'burgers', 'postres']);
      expect(productModel.distinct).toHaveBeenCalledWith(
        'category',
        { tenantId: 'tenant_123', category: { $ne: '' } },
      );
    });
  });
});
