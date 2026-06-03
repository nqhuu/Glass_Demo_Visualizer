import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlassProduct } from '../glass-catalog/glass-product.entity';
import { GlassRenderPreset } from '../glass-catalog/glass-render-preset.entity';
import { GlassRegionPane } from './glass-region-pane.entity';
import { GlassRegion } from './glass-region.entity';
import { ProjectExport } from './project-export.entity';
import { ProjectImage } from './project-image.entity';
import { Project } from './project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuditLogModule } from '../audit/audit-log.module';

// VI: Module du an gom anh, region/pane, gan vat lieu va export demo co watermark Sprint 10.
@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectImage, GlassRegion, GlassRegionPane, ProjectExport, GlassProduct, GlassRenderPreset]), AuditLogModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
