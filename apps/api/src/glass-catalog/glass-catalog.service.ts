import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { CreateGlassCategoryDto } from './dto/create-glass-category.dto';
import { CreateGlassProductDto } from './dto/create-glass-product.dto';
import { ListGlassProductsDto } from './dto/list-glass-products.dto';
import { UpdateGlassCategoryDto } from './dto/update-glass-category.dto';
import { UpdateGlassProductDto } from './dto/update-glass-product.dto';
import { GlassCategory } from './glass-category.entity';
import { GlassProduct } from './glass-product.entity';

interface SafeCatalogErrorLog {
  errorName: string;
  errorCode?: string;
  errorMessage: string;
}

interface CatalogAssetResponse {
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

// VI: Service xu ly CRUD catalog kinh va bao ve loi database bang thong bao an toan.
@Injectable()
export class GlassCatalogService {
  private readonly logger = new Logger(GlassCatalogService.name);

  constructor(
    @InjectRepository(GlassCategory)
    private readonly categoriesRepository: Repository<GlassCategory>,
    @InjectRepository(GlassProduct)
    private readonly productsRepository: Repository<GlassProduct>,
    private readonly configService: ConfigService,
  ) {}

  async listCategories(): Promise<GlassCategory[]> {
    try {
      return await this.categoriesRepository.find({
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error) {
      this.logAndThrow('listCategories', 'Unable to load glass categories.', error);
    }
  }

  async listActiveCategories(): Promise<GlassCategory[]> {
    try {
      return await this.categoriesRepository.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error) {
      this.logAndThrow('listActiveCategories', 'Unable to load active glass categories.', error);
    }
  }

  async createCategory(dto: CreateGlassCategoryDto): Promise<GlassCategory> {
    try {
      const category = this.categoriesRepository.create({
        ...dto,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      });

      return await this.categoriesRepository.save(category);
    } catch (error) {
      this.logAndThrow('createCategory', 'Unable to create glass category.', error);
    }
  }

  async updateCategory(id: number, dto: UpdateGlassCategoryDto): Promise<GlassCategory> {
    try {
      const category = await this.categoriesRepository.findOne({ where: { id } });

      if (!category) {
        throw new NotFoundException('Glass category was not found.');
      }

      Object.assign(category, {
        ...dto,
        description: dto.description === undefined ? category.description : dto.description.trim() || null,
      });

      return await this.categoriesRepository.save(category);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('updateCategory', 'Unable to update glass category.', error, { categoryId: id });
    }
  }

  async deleteCategory(id: number): Promise<{ deleted: true }> {
    try {
      const category = await this.categoriesRepository.findOne({
        where: { id },
        relations: { products: true },
      });

      if (!category) {
        throw new NotFoundException('Glass category was not found.');
      }

      if (category.products.length > 0) {
        throw new BadRequestException('Remove or reassign products before deleting this category.');
      }

      await this.categoriesRepository.remove(category);
      return { deleted: true };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('deleteCategory', 'Unable to delete glass category.', error, { categoryId: id });
    }
  }

  async listProducts(query: ListGlassProductsDto): Promise<GlassProduct[]> {
    try {
      const where = this.buildProductWhere(query);

      return await this.productsRepository.find({
        where,
        relations: { category: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error) {
      this.logAndThrow('listProducts', 'Unable to load glass products.', error);
    }
  }

  async listActiveProducts(query: ListGlassProductsDto): Promise<GlassProduct[]> {
    return this.listProducts({ ...query, isActive: true });
  }

  async getCatalogAsset(fileName: string): Promise<CatalogAssetResponse> {
    try {
      const contentType = this.getCatalogAssetContentType(fileName);
      const catalogRoot = resolve(this.configService.get<string>('UPLOAD_ROOT') ?? './uploads', 'catalog');
      const absolutePath = resolve(catalogRoot, fileName);
      const relativePath = relative(catalogRoot, absolutePath);

      // VI: Chi doc file nam trong thu muc catalog, tranh traversal sang anh du an hoac file may chu.
      if (isAbsolute(relativePath) || relativePath.startsWith('..')) {
        throw new NotFoundException('Catalog asset was not found.');
      }

      const buffer = await readFile(absolutePath);
      if (!this.hasMatchingImageSignature(buffer, contentType)) {
        throw new NotFoundException('Catalog asset was not found.');
      }

      return { buffer, contentType };
    } catch (error) {
      if (error instanceof NotFoundException || this.isMissingFileError(error)) {
        throw new NotFoundException('Catalog asset was not found.');
      }
      this.logAndThrow('getCatalogAsset', 'Unable to load catalog asset.', error);
    }
  }

  async createProduct(dto: CreateGlassProductDto): Promise<GlassProduct> {
    try {
      await this.ensureCategoryExists(dto.categoryId);
      const product = this.productsRepository.create(this.normalizeProductInput(dto));

      return await this.productsRepository.save(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('createProduct', 'Unable to create glass product.', error);
    }
  }

  async updateProduct(id: number, dto: UpdateGlassProductDto): Promise<GlassProduct> {
    try {
      const product = await this.productsRepository.findOne({ where: { id } });

      if (!product) {
        throw new NotFoundException('Glass product was not found.');
      }

      await this.ensureCategoryExists(dto.categoryId);
      Object.assign(product, this.normalizeProductInput(dto, product));

      return await this.productsRepository.save(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('updateProduct', 'Unable to update glass product.', error, { productId: id });
    }
  }

  async deleteProduct(id: number): Promise<GlassProduct> {
    try {
      const product = await this.productsRepository.findOne({ where: { id } });

      if (!product) {
        throw new NotFoundException('Glass product was not found.');
      }

      // VI: Delete trong Sprint 3 la soft deactivate de tranh mat san pham da duoc gan ve sau.
      product.isActive = false;
      return await this.productsRepository.save(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('deleteProduct', 'Unable to deactivate glass product.', error, { productId: id });
    }
  }

  private buildProductWhere(query: ListGlassProductsDto): FindOptionsWhere<GlassProduct>[] | FindOptionsWhere<GlassProduct> {
    const baseWhere: FindOptionsWhere<GlassProduct> = {};

    if (query.categoryId) {
      baseWhere.categoryId = query.categoryId;
    }

    if (query.isActive !== undefined) {
      baseWhere.isActive = query.isActive;
    }

    if (!query.search) {
      return baseWhere;
    }

    const search = `%${query.search.trim()}%`;
    return [
      { ...baseWhere, name: Like(search) },
      { ...baseWhere, code: Like(search) },
    ];
  }

  private normalizeProductInput(
    dto: CreateGlassProductDto | UpdateGlassProductDto,
    current?: GlassProduct,
  ): Partial<GlassProduct> {
    const previewImageUrl = this.normalizeOptionalMediaUrl(dto.previewImageUrl);
    const textureImageUrl = this.normalizeOptionalMediaUrl(dto.textureImageUrl);

    return {
      ...dto,
      description: dto.description === undefined ? current?.description : dto.description.trim() || null,
      categoryId: dto.categoryId === undefined ? current?.categoryId : dto.categoryId,
      previewImageUrl: previewImageUrl === undefined ? current?.previewImageUrl ?? null : previewImageUrl,
      textureImageUrl: textureImageUrl === undefined ? current?.textureImageUrl ?? null : textureImageUrl,
      isActive: dto.isActive ?? current?.isActive ?? true,
      sortOrder: dto.sortOrder ?? current?.sortOrder ?? 0,
    };
  }

  private normalizeOptionalMediaUrl(value: string | null | undefined): string | null | undefined {
    // VI: Undefined giu gia tri khi update; null/chuoi trong xoa URL; string hop le duoc trim truoc khi luu.
    if (value === undefined || value === null) {
      return value;
    }

    return value.trim() || null;
  }

  private async ensureCategoryExists(categoryId?: number | null): Promise<void> {
    if (!categoryId) {
      return;
    }

    const category = await this.categoriesRepository.findOne({ where: { id: categoryId } });

    if (!category) {
      throw new NotFoundException('Glass category was not found.');
    }
  }

  private getCatalogAssetContentType(fileName: string): CatalogAssetResponse['contentType'] {
    // VI: Route public catalog chi cho phep ten file server an toan va dinh dang anh raster da kiem tra.
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(jpe?g|png|webp)$/i.test(fileName)) {
      throw new NotFoundException('Catalog asset was not found.');
    }

    switch (extname(fileName).toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      default:
        throw new NotFoundException('Catalog asset was not found.');
    }
  }

  private hasMatchingImageSignature(buffer: Buffer, contentType: CatalogAssetResponse['contentType']): boolean {
    if (contentType === 'image/jpeg') {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (contentType === 'image/png') {
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }

  private isMissingFileError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'ENOENT');
  }

  private logAndThrow(action: string, message: string, error: unknown, context?: Record<string, string | number>): never {
    this.logger.error({
      module: 'GlassCatalogService',
      action,
      ...(context ?? {}),
      message,
      ...this.sanitizeErrorForLog(error),
    });
    throw new InternalServerErrorException(message);
  }

  private sanitizeErrorForLog(error: unknown): SafeCatalogErrorLog {
    // VI: Khong ghi raw loi/du lieu catalog do chung co the chua gia tri nguoi dung gui len.
    const errorRecord = typeof error === 'object' && error !== null ? (error as { code?: unknown }) : {};
    const errorCode = typeof errorRecord.code === 'string' || typeof errorRecord.code === 'number' ? String(errorRecord.code) : undefined;

    return {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorCode,
      errorMessage: 'Catalog operation failed.',
    };
  }
}
