import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlassMaterialType } from './enums/glass-material-type.enum';
import { GlassRealismPreset } from './enums/glass-realism-preset.enum';
import { GlassCategory } from './glass-category.entity';
import { GlassProduct } from './glass-product.entity';

interface DemoCategorySeed {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

interface DemoProductSeed {
  name: string;
  code: string;
  description: string;
  categorySlug: string;
  materialType: GlassMaterialType;
  baseColor: string;
  tintStrength: number;
  reflectivityLevel: number;
  transmissionLevel: number;
  shadowLevel: number;
  realismPreset: GlassRealismPreset;
  sortOrder: number;
}

const DEMO_CATEGORIES: DemoCategorySeed[] = [
  { name: 'Energy Efficient', slug: 'demo-energy-efficient', description: 'Low-E glass samples for facade and window consultations.', sortOrder: 10 },
  { name: 'Architectural Finish', slug: 'demo-architectural-finish', description: 'Reflective and decorative samples for design previews.', sortOrder: 20 },
];

const DEMO_PRODUCTS: DemoProductSeed[] = [
  {
    name: 'Low-E Clear 6mm',
    code: 'DEMO-LCE-06',
    description: 'Clear Low-E sample with restrained neutral reflection.',
    categorySlug: 'demo-energy-efficient',
    materialType: GlassMaterialType.Clear,
    baseColor: '#dbeafe',
    tintStrength: 0.12,
    reflectivityLevel: 0.24,
    transmissionLevel: 0.82,
    shadowLevel: 0.12,
    realismPreset: GlassRealismPreset.Facade,
    sortOrder: 10,
  },
  {
    name: 'Solar Blue 6mm',
    code: 'DEMO-SBL-06',
    description: 'Soft blue solar control glass for balcony and facade previews.',
    categorySlug: 'demo-architectural-finish',
    materialType: GlassMaterialType.Tinted,
    baseColor: '#9dc7db',
    tintStrength: 0.28,
    reflectivityLevel: 0.34,
    transmissionLevel: 0.67,
    shadowLevel: 0.16,
    realismPreset: GlassRealismPreset.Balcony,
    sortOrder: 20,
  },
  {
    name: 'Reflective Grey 6mm',
    code: 'DEMO-RGY-06',
    description: 'Grey reflective glass for commercial facade demonstrations.',
    categorySlug: 'demo-architectural-finish',
    materialType: GlassMaterialType.Reflective,
    baseColor: '#94a3b8',
    tintStrength: 0.2,
    reflectivityLevel: 0.56,
    transmissionLevel: 0.5,
    shadowLevel: 0.2,
    realismPreset: GlassRealismPreset.Facade,
    sortOrder: 30,
  },
];

// VI: Seed catalog mau chi chay khi local demo bat ro rang; code/slug duy nhat giup chay lai khong trung lap.
@Injectable()
export class GlassCatalogSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GlassCatalogSeedService.name);

  constructor(
    @InjectRepository(GlassCategory)
    private readonly categoriesRepository: Repository<GlassCategory>,
    @InjectRepository(GlassProduct)
    private readonly productsRepository: Repository<GlassProduct>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (
      this.configService.get<string>('NODE_ENV') !== 'development' ||
      this.configService.get<string>('SEED_DEMO_DATA_ENABLED') !== 'true'
    ) {
      return;
    }

    try {
      const categories = await this.seedCategories();
      const productsCreated = await this.seedProducts(categories);
      this.logger.log({
        module: 'GlassCatalogSeedService',
        action: 'onApplicationBootstrap',
        message: 'Local demo catalog is available.',
        productsCreated,
      });
    } catch (error) {
      this.logger.error({
        module: 'GlassCatalogSeedService',
        action: 'onApplicationBootstrap',
        message: 'Failed to seed local demo catalog.',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: 'Local catalog seed operation failed.',
      });
      throw error;
    }
  }

  private async seedCategories(): Promise<Map<string, GlassCategory>> {
    const seededCategories = new Map<string, GlassCategory>();

    for (const input of DEMO_CATEGORIES) {
      const existing = await this.categoriesRepository.findOne({ where: { slug: input.slug } });
      const category =
        existing ??
        (await this.categoriesRepository.save(
          this.categoriesRepository.create({
            ...input,
            isActive: true,
          }),
        ));
      seededCategories.set(input.slug, category);
    }

    return seededCategories;
  }

  private async seedProducts(categories: Map<string, GlassCategory>): Promise<number> {
    let productsCreated = 0;

    for (const input of DEMO_PRODUCTS) {
      if (await this.productsRepository.findOne({ where: { code: input.code } })) {
        continue;
      }

      const { categorySlug, ...productInput } = input;
      const category = categories.get(categorySlug);
      if (!category) {
        throw new Error('Required demo category was not seeded.');
      }

      await this.productsRepository.save(
        this.productsRepository.create({
          ...productInput,
          categoryId: category.id,
          category,
          previewImageUrl: null,
          textureImageUrl: null,
          isActive: true,
        }),
      );
      productsCreated += 1;
    }

    return productsCreated;
  }
}
