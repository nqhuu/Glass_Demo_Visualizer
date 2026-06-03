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
import { CreateGlassMaterialTypeDto } from './dto/create-glass-material-type.dto';
import { CreateGlassRenderPresetDto } from './dto/create-glass-render-preset.dto';
import { UpdateGlassMaterialTypeDto } from './dto/update-glass-material-type.dto';
import { UpdateGlassProductDto } from './dto/update-glass-product.dto';
import { UpdateGlassRenderPresetDto } from './dto/update-glass-render-preset.dto';
import { GlassCategory } from './glass-category.entity';
import { GlassMaterialTypeEntity } from './glass-material-type.entity';
import { GlassProduct } from './glass-product.entity';
import { GlassRenderPreset } from './glass-render-preset.entity';
import { GlassMaterialType } from './enums/glass-material-type.enum';
import { GlassRealismPreset } from './enums/glass-realism-preset.enum';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtPayload } from '../auth/auth.types';

interface SafeCatalogErrorLog {
  errorName: string;
  errorCode?: string;
  errorMessage: string;
}

type AuditMetadata = Record<string, string | number | boolean | null>;

interface CatalogStatusAudit {
  action: string;
  safeMessage: string;
  metadataJson?: AuditMetadata;
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
    @InjectRepository(GlassMaterialTypeEntity)
    private readonly materialTypesRepository: Repository<GlassMaterialTypeEntity>,
    @InjectRepository(GlassRenderPreset)
    private readonly renderPresetsRepository: Repository<GlassRenderPreset>,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
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
        where: { isActive: true, isArchived: false },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error) {
      this.logAndThrow('listActiveCategories', 'Unable to load active glass categories.', error);
    }
  }

  async createCategory(user: JwtPayload, dto: CreateGlassCategoryDto): Promise<GlassCategory> {
    try {
      const category = this.categoriesRepository.create({
        ...dto,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
        isArchived: dto.isArchived ?? false,
        sortOrder: dto.sortOrder ?? 0,
      });

      const saved = await this.categoriesRepository.save(category);
      await this.recordAdminAction(user, 'catalog.category.create', 'glass_category', saved.id, 'Glass category created.');
      return saved;
    } catch (error) {
      this.logAndThrow('createCategory', 'Unable to create glass category.', error);
    }
  }

  async updateCategory(user: JwtPayload, id: number, dto: UpdateGlassCategoryDto): Promise<GlassCategory> {
    try {
      const category = await this.categoriesRepository.findOne({ where: { id } });

      if (!category) {
        throw new NotFoundException('Glass category was not found.');
      }

      const previousIsActive = category.isActive;
      const previousIsArchived = category.isArchived;
      Object.assign(category, {
        ...dto,
        description: dto.description === undefined ? category.description : dto.description.trim() || null,
        isActive: dto.isArchived === true ? false : dto.isActive ?? category.isActive,
        isArchived: dto.isArchived ?? category.isArchived,
      });

      const saved = await this.categoriesRepository.save(category);
      const audit = this.resolveLifecycleAudit('catalog.category', 'Glass category', previousIsActive, previousIsArchived, dto.isActive, dto.isArchived);
      await this.recordAdminAction(user, audit.action, 'glass_category', saved.id, audit.safeMessage, audit.metadataJson);
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('updateCategory', 'Unable to update glass category.', error, { categoryId: id });
    }
  }

  async deleteCategory(user: JwtPayload, id: number): Promise<{ deleted: true }> {
    try {
      const category = await this.categoriesRepository.findOne({
        where: { id },
        relations: { products: true },
      });

      if (!category) {
        throw new NotFoundException('Glass category was not found.');
      }

      // VI: Category delete trong MVP la archive mem de khong pha product/history dang tham chieu.
      category.isActive = false;
      category.isArchived = true;
      const saved = await this.categoriesRepository.save(category);
      await this.recordAdminAction(user, 'catalog.category.archive', 'glass_category', saved.id, 'Glass category archived.');
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
        relations: { category: true, materialTypeConfig: true, renderPreset: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error) {
      this.logAndThrow('listProducts', 'Unable to load glass products.', error);
    }
  }

  async listActiveProducts(query: ListGlassProductsDto): Promise<GlassProduct[]> {
    const products = await this.listProducts({ ...query, isActive: true, isArchived: false });
    return products.filter((product) => !product.category || (product.category.isActive && !product.category.isArchived));
  }

  async listActiveMaterialTypes(): Promise<GlassMaterialTypeEntity[]> {
    try {
      return await this.materialTypesRepository.find({
        where: { isActive: true, isArchived: false },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error) {
      this.logAndThrow('listActiveMaterialTypes', 'Unable to load material types.', error);
    }
  }

  async listActiveRenderPresets(): Promise<GlassRenderPreset[]> {
    try {
      return await this.renderPresetsRepository.find({
        where: { isActive: true, isArchived: false },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (error) {
      this.logAndThrow('listActiveRenderPresets', 'Unable to load render presets.', error);
    }
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

  async createProduct(user: JwtPayload, dto: CreateGlassProductDto): Promise<GlassProduct> {
    try {
      await this.ensureCategoryExists(dto.categoryId);
      const materialTypeConfig = await this.ensureMaterialTypeExists(dto.materialTypeId);
      await this.ensureRenderPresetExists(dto.renderPresetId);
      const product = this.productsRepository.create(this.normalizeProductInput(dto, undefined, materialTypeConfig));

      const saved = await this.productsRepository.save(product);
      await this.recordAdminAction(user, 'catalog.product.create', 'glass_product', saved.id, 'Glass product created.');
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('createProduct', 'Unable to create glass product.', error);
    }
  }

  async updateProduct(user: JwtPayload, id: number, dto: UpdateGlassProductDto): Promise<GlassProduct> {
    try {
      const product = await this.productsRepository.findOne({ where: { id } });

      if (!product) {
        throw new NotFoundException('Glass product was not found.');
      }

      const previousIsActive = product.isActive;
      const previousIsArchived = product.isArchived;
      await this.ensureCategoryExists(dto.categoryId);
      const materialTypeConfig = await this.ensureMaterialTypeExists(dto.materialTypeId);
      await this.ensureRenderPresetExists(dto.renderPresetId);
      Object.assign(product, this.normalizeProductInput(dto, product, materialTypeConfig));

      const saved = await this.productsRepository.save(product);
      const audit = this.resolveLifecycleAudit('catalog.product', 'Glass product', previousIsActive, previousIsArchived, dto.isActive, dto.isArchived);
      await this.recordAdminAction(user, audit.action, 'glass_product', saved.id, audit.safeMessage, audit.metadataJson);
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('updateProduct', 'Unable to update glass product.', error, { productId: id });
    }
  }

  async deleteProduct(user: JwtPayload, id: number): Promise<GlassProduct> {
    try {
      const product = await this.productsRepository.findOne({ where: { id } });

      if (!product) {
        throw new NotFoundException('Glass product was not found.');
      }

      // VI: Delete trong MVP la archive mem de region/export cu van giu duoc tham chieu product.
      product.isActive = false;
      product.isArchived = true;
      const saved = await this.productsRepository.save(product);
      await this.recordAdminAction(user, 'catalog.product.archive', 'glass_product', saved.id, 'Glass product archived.');
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('deleteProduct', 'Unable to deactivate glass product.', error, { productId: id });
    }
  }

  async listMaterialTypes(): Promise<GlassMaterialTypeEntity[]> {
    try {
      return await this.materialTypesRepository.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
    } catch (error) {
      this.logAndThrow('listMaterialTypes', 'Unable to load material types.', error);
    }
  }

  async createMaterialType(user: JwtPayload, dto: CreateGlassMaterialTypeDto): Promise<GlassMaterialTypeEntity> {
    try {
      const materialType = this.materialTypesRepository.create(this.normalizeMaterialTypeInput(dto));
      const saved = await this.materialTypesRepository.save(materialType);
      await this.recordAdminAction(user, 'catalog.material-type.create', 'glass_material_type', saved.id, 'Glass material type created.');
      return saved;
    } catch (error) {
      this.logAndThrow('createMaterialType', 'Unable to create material type.', error);
    }
  }

  async updateMaterialType(user: JwtPayload, id: number, dto: UpdateGlassMaterialTypeDto): Promise<GlassMaterialTypeEntity> {
    try {
      const materialType = await this.materialTypesRepository.findOne({ where: { id } });
      if (!materialType) {
        throw new NotFoundException('Glass material type was not found.');
      }

      const previousIsActive = materialType.isActive;
      const previousIsArchived = materialType.isArchived;
      Object.assign(materialType, this.normalizeMaterialTypeInput(dto, materialType));
      const saved = await this.materialTypesRepository.save(materialType);
      const audit = this.resolveLifecycleAudit('catalog.material-type', 'Glass material type', previousIsActive, previousIsArchived, dto.isActive, dto.isArchived);
      await this.recordAdminAction(user, audit.action, 'glass_material_type', saved.id, audit.safeMessage, audit.metadataJson);
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('updateMaterialType', 'Unable to update material type.', error, { materialTypeId: id });
    }
  }

  async deleteMaterialType(user: JwtPayload, id: number): Promise<GlassMaterialTypeEntity> {
    try {
      const materialType = await this.materialTypesRepository.findOne({ where: { id } });
      if (!materialType) {
        throw new NotFoundException('Glass material type was not found.');
      }

      materialType.isActive = false;
      materialType.isArchived = true;
      const saved = await this.materialTypesRepository.save(materialType);
      await this.recordAdminAction(user, 'catalog.material-type.archive', 'glass_material_type', saved.id, 'Glass material type archived.');
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('deleteMaterialType', 'Unable to archive material type.', error, { materialTypeId: id });
    }
  }

  async listRenderPresets(): Promise<GlassRenderPreset[]> {
    try {
      return await this.renderPresetsRepository.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
    } catch (error) {
      this.logAndThrow('listRenderPresets', 'Unable to load render presets.', error);
    }
  }

  async createRenderPreset(user: JwtPayload, dto: CreateGlassRenderPresetDto): Promise<GlassRenderPreset> {
    try {
      const renderPreset = this.renderPresetsRepository.create(this.normalizeRenderPresetInput(dto));
      const saved = await this.renderPresetsRepository.save(renderPreset);
      await this.recordAdminAction(user, 'catalog.render-preset.create', 'glass_render_preset', saved.id, 'Glass render preset created.');
      return saved;
    } catch (error) {
      this.logAndThrow('createRenderPreset', 'Unable to create render preset.', error);
    }
  }

  async updateRenderPreset(user: JwtPayload, id: number, dto: UpdateGlassRenderPresetDto): Promise<GlassRenderPreset> {
    try {
      const renderPreset = await this.renderPresetsRepository.findOne({ where: { id } });
      if (!renderPreset) {
        throw new NotFoundException('Glass render preset was not found.');
      }

      const previousIsActive = renderPreset.isActive;
      const previousIsArchived = renderPreset.isArchived;
      Object.assign(renderPreset, this.normalizeRenderPresetInput(dto, renderPreset));
      const saved = await this.renderPresetsRepository.save(renderPreset);
      const audit = this.resolveLifecycleAudit('catalog.render-preset', 'Glass render preset', previousIsActive, previousIsArchived, dto.isActive, dto.isArchived);
      await this.recordAdminAction(user, audit.action, 'glass_render_preset', saved.id, audit.safeMessage, audit.metadataJson);
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('updateRenderPreset', 'Unable to update render preset.', error, { renderPresetId: id });
    }
  }

  async deleteRenderPreset(user: JwtPayload, id: number): Promise<GlassRenderPreset> {
    try {
      const renderPreset = await this.renderPresetsRepository.findOne({ where: { id } });
      if (!renderPreset) {
        throw new NotFoundException('Glass render preset was not found.');
      }

      renderPreset.isActive = false;
      renderPreset.isArchived = true;
      const saved = await this.renderPresetsRepository.save(renderPreset);
      await this.recordAdminAction(user, 'catalog.render-preset.archive', 'glass_render_preset', saved.id, 'Glass render preset archived.');
      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logAndThrow('deleteRenderPreset', 'Unable to archive render preset.', error, { renderPresetId: id });
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

    if (query.isArchived !== undefined) {
      baseWhere.isArchived = query.isArchived;
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
    materialTypeConfig?: GlassMaterialTypeEntity | null,
  ): Partial<GlassProduct> {
    const previewImageUrl = this.normalizeOptionalMediaUrl(dto.previewImageUrl);
    const textureImageUrl = this.normalizeOptionalMediaUrl(dto.textureImageUrl);
    const materialTypeId = dto.materialTypeId === undefined ? current?.materialTypeId ?? null : dto.materialTypeId;
    const renderPresetId = dto.renderPresetId === undefined ? current?.renderPresetId ?? null : dto.renderPresetId;

    return {
      ...dto,
      description: dto.description === undefined ? current?.description : this.normalizeNullableText(dto.description),
      categoryId: dto.categoryId === undefined ? current?.categoryId : dto.categoryId,
      // VI: Product van luu enum cu de renderer/export hien co tuong thich voi du lieu truoc khi co bang material type.
      materialType: dto.materialType ?? (materialTypeConfig ? this.mapMaterialCodeToRendererType(materialTypeConfig.code) : current?.materialType ?? GlassMaterialType.Clear),
      materialTypeId,
      tintStrength: this.normalizePercentValue(dto.tintStrength, current?.tintStrength, 0.25),
      reflectivityLevel: this.normalizePercentValue(dto.reflectivityLevel, current?.reflectivityLevel, 0.35),
      transmissionLevel: this.normalizePercentValue(dto.transmissionLevel, current?.transmissionLevel, 0.65),
      shadowLevel: this.normalizePercentValue(dto.shadowLevel, current?.shadowLevel, 0.2),
      realismPreset: dto.realismPreset ?? current?.realismPreset ?? GlassRealismPreset.Standard,
      renderPresetId,
      previewImageUrl: previewImageUrl === undefined ? current?.previewImageUrl ?? null : previewImageUrl,
      textureImageUrl: textureImageUrl === undefined ? current?.textureImageUrl ?? null : textureImageUrl,
      isActive: dto.isArchived === true ? false : dto.isActive ?? current?.isActive ?? true,
      isArchived: dto.isArchived ?? current?.isArchived ?? false,
      sortOrder: dto.sortOrder ?? current?.sortOrder ?? 0,
    };
  }

  private normalizePercentValue(value: number | undefined, current: number | undefined, fallback: number): number {
    // VI: API nhan percent nguyen 0-100 de admin chinh 1%; DB van luu ratio 0-1 cho renderer hien tai.
    return value === undefined ? current ?? fallback : value / 100;
  }

  private normalizeOptionalMediaUrl(value: string | null | undefined): string | null | undefined {
    // VI: Undefined giu gia tri khi update; null/chuoi trong xoa URL; string hop le duoc trim truoc khi luu.
    if (value === undefined || value === null) {
      return value;
    }

    return value.trim() || null;
  }

  private normalizeNullableText(value: string | null | undefined): string | null {
    return typeof value === 'string' ? value.trim() || null : null;
  }

  private normalizeMaterialTypeInput(
    dto: CreateGlassMaterialTypeDto | UpdateGlassMaterialTypeDto,
    current?: GlassMaterialTypeEntity,
  ): Partial<GlassMaterialTypeEntity> {
    return {
      name: dto.name === undefined ? current?.name : dto.name.trim(),
      code: dto.code === undefined ? current?.code : dto.code.trim().toLowerCase(),
      description: dto.description === undefined ? current?.description : this.normalizeNullableText(dto.description),
      isActive: dto.isArchived === true ? false : dto.isActive ?? current?.isActive ?? true,
      isArchived: dto.isArchived ?? current?.isArchived ?? false,
      sortOrder: dto.sortOrder ?? current?.sortOrder ?? 0,
    };
  }

  private normalizeRenderPresetInput(
    dto: CreateGlassRenderPresetDto | UpdateGlassRenderPresetDto,
    current?: GlassRenderPreset,
  ): Partial<GlassRenderPreset> {
    return {
      name: dto.name === undefined ? current?.name : dto.name.trim(),
      code: dto.code === undefined ? current?.code : dto.code.trim().toLowerCase(),
      description: dto.description === undefined ? current?.description : this.normalizeNullableText(dto.description),
      defaultTintPercent: dto.defaultTintPercent ?? current?.defaultTintPercent ?? 25,
      defaultReflectivityPercent: dto.defaultReflectivityPercent ?? current?.defaultReflectivityPercent ?? 35,
      defaultTransmissionPercent: dto.defaultTransmissionPercent ?? current?.defaultTransmissionPercent ?? 65,
      defaultShadowPercent: dto.defaultShadowPercent ?? current?.defaultShadowPercent ?? 20,
      isActive: dto.isArchived === true ? false : dto.isActive ?? current?.isActive ?? true,
      isArchived: dto.isArchived ?? current?.isArchived ?? false,
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

  private async ensureMaterialTypeExists(materialTypeId?: number | null): Promise<GlassMaterialTypeEntity | null> {
    if (!materialTypeId) {
      return null;
    }

    const materialType = await this.materialTypesRepository.findOne({ where: { id: materialTypeId } });
    if (!materialType) {
      throw new NotFoundException('Glass material type was not found.');
    }
    // VI: Product chi duoc tham chieu material type dang hoat dong; inactive/archive khong duoc gan moi.
    if (!materialType.isActive || materialType.isArchived) {
      throw new BadRequestException('Glass material type is not active.');
    }
    return materialType;
  }

  private async ensureRenderPresetExists(renderPresetId?: number | null): Promise<GlassRenderPreset | null> {
    if (!renderPresetId) {
      return null;
    }

    const renderPreset = await this.renderPresetsRepository.findOne({ where: { id: renderPresetId } });
    if (!renderPreset) {
      throw new NotFoundException('Glass render preset was not found.');
    }
    // VI: Preset render inactive/archive khong duoc dung cho product moi hoac cap nhat product.
    if (!renderPreset.isActive || renderPreset.isArchived) {
      throw new BadRequestException('Glass render preset is not active.');
    }
    return renderPreset;
  }

  private mapMaterialCodeToRendererType(code: string): GlassMaterialType {
    const normalizedCode = code.toLowerCase();
    if (normalizedCode.includes('frost')) {
      return GlassMaterialType.Frosted;
    }
    if (normalizedCode.includes('pattern')) {
      return GlassMaterialType.Patterned;
    }
    if (normalizedCode.includes('reflect') || normalizedCode.includes('mirror')) {
      return GlassMaterialType.Reflective;
    }
    if (normalizedCode.includes('tint') || normalizedCode.includes('bronze') || normalizedCode.includes('solar')) {
      return GlassMaterialType.Tinted;
    }
    return GlassMaterialType.Clear;
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

  private resolveLifecycleAudit(
    baseAction: string,
    label: string,
    previousIsActive: boolean,
    previousIsArchived: boolean,
    nextIsActive: unknown,
    nextIsArchived: unknown,
  ): CatalogStatusAudit {
    // VI: Uu tien archive/restore, sau do moi de/reactivate; metadata chi la trang thai allowlist.
    if (typeof nextIsArchived === 'boolean' && nextIsArchived !== previousIsArchived) {
      return {
        action: nextIsArchived ? `${baseAction}.archive` : `${baseAction}.restore`,
        safeMessage: nextIsArchived ? `${label} archived.` : `${label} restored.`,
        metadataJson: {
          changedField: 'isArchived',
          previousIsArchived,
          newIsArchived: nextIsArchived,
        },
      };
    }

    if (typeof nextIsActive !== 'boolean' || nextIsActive === previousIsActive) {
      return {
        action: `${baseAction}.update`,
        safeMessage: `${label} updated.`,
      };
    }

    return {
      action: nextIsActive ? `${baseAction}.reactivate` : `${baseAction}.deactivate`,
      safeMessage: nextIsActive ? `${label} reactivated.` : `${label} deactivated.`,
      metadataJson: {
        changedField: 'isActive',
        previousIsActive,
        newIsActive: nextIsActive,
      },
    };
  }

  private recordAdminAction(user: JwtPayload, action: string, entityType: string, entityId: number, safeMessage: string, metadataJson?: AuditMetadata): Promise<void> {
    // VI: Audit catalog chi luu actor/id/action, khong luu profile vat lieu hoac DTO admin.
    return this.auditLogService.recordAction({
      actorUserId: user.sub,
      actorRole: user.role,
      action,
      entityType,
      entityId,
      safeMessage,
      metadataJson,
    });
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
