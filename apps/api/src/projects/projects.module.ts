import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlassRegionPane } from './glass-region-pane.entity';
import { GlassRegion } from './glass-region.entity';
import { ProjectImage } from './project-image.entity';
import { Project } from './project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

// VI: Module Sprint 4 cho nen tang du an va nhieu anh trong mot du an.
@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectImage, GlassRegion, GlassRegionPane])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
