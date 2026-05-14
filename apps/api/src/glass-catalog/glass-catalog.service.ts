import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { CreateGlassCategoryDto } from './dto/create-glass-category.dto';
import { CreateGlassProductDto } from './dto/create-glass-product.dto';
import { ListGlassProductsDto } from './dto/list-glass-products.dto';
import { UpdateGlassCategoryDto } from './dto/update-glass-category.dto';
import { UpdateGlassProductDto } from './dto/update-glass-product.dto';
import { GlassCategory } from './glass-category.entity';
import { GlassProduct } from './glass-product.entity';

// VI: Service xu ly CRUD catalog kinh va bao ve loi database bang thong bao an toan.
@Injectable()
export class GlassCatalogService {
  private readonly logger = new Logger(GlassCatalogService.name);

  constructor(
    @InjectRepository(GlassCategory)
    private readonly categoriesRepository: Repository<GlassCategory>,
    @InjectRepository(GlassProduct)
    private readonly productsRepository: Repository<GlassProduct>,
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
      this.logAndThrow('createCategory', 'Unable to create glass category.', error, { slug: dto.slug });
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

  async createProduct(dto: CreateGlassProductDto): Promise<GlassProduct> {
    try {
      await this.ensureCategoryExists(dto.categoryId);
      const product = this.productsRepository.create(this.normalizeProductInput(dto));

      return await this.productsRepository.save(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('createProduct', 'Unable to create glass product.', error, { code: dto.code });
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
    return {
      ...dto,
      description: dto.description === undefined ? current?.description : dto.description.trim() || null,
      categoryId: dto.categoryId === undefined ? current?.categoryId : dto.categoryId,
      previewImageUrl: dto.previewImageUrl === undefined ? current?.previewImageUrl : dto.previewImageUrl.trim() || null,
      textureImageUrl: dto.textureImageUrl === undefined ? current?.textureImageUrl : dto.textureImageUrl.trim() || null,
      isActive: dto.isActive ?? current?.isActive ?? true,
      sortOrder: dto.sortOrder ?? current?.sortOrder ?? 0,
    };
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

  private logAndThrow(action: string, message: string, error: unknown, context?: Record<string, string | number>): never {
    this.logger.error({
      module: 'GlassCatalogService',
      action,
      ...(context ?? {}),
      message,
      error,
    });
    throw new InternalServerErrorException(message);
  }
}
