import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlassCatalogController } from './glass-catalog.controller';
import { GlassCatalogSeedService } from './glass-catalog-seed.service';
import { GlassCatalogService } from './glass-catalog.service';
import { GlassCategory } from './glass-category.entity';
import { GlassMaterialTypeEntity } from './glass-material-type.entity';
import { GlassProduct } from './glass-product.entity';
import { GlassRenderPreset } from './glass-render-preset.entity';
import { AuditLogModule } from '../audit/audit-log.module';

// VI: Module catalog kinh quan ly san pham va seed du lieu demo local co kiem soat.
@Module({
  imports: [TypeOrmModule.forFeature([GlassCategory, GlassProduct, GlassMaterialTypeEntity, GlassRenderPreset]), AuditLogModule],
  controllers: [GlassCatalogController],
  providers: [GlassCatalogService, GlassCatalogSeedService],
})
export class GlassCatalogModule {}
