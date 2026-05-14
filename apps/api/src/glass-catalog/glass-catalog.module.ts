import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlassCatalogController } from './glass-catalog.controller';
import { GlassCatalogService } from './glass-catalog.service';
import { GlassCategory } from './glass-category.entity';
import { GlassProduct } from './glass-product.entity';

// VI: Module catalog kinh quan ly danh muc, san pham va profile vat lieu admin.
@Module({
  imports: [TypeOrmModule.forFeature([GlassCategory, GlassProduct])],
  controllers: [GlassCatalogController],
  providers: [GlassCatalogService],
})
export class GlassCatalogModule {}
