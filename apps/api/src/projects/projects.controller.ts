import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.types';
import { CreateGlassRegionDto } from './dto/create-glass-region.dto';
import { CreateProjectImageDto } from './dto/create-project-image.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectImageDto } from './dto/update-project-image.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UploadProjectImageDto } from './dto/upload-project-image.dto';
import { ProjectsService } from './projects.service';
import { UploadedProjectFile } from './uploaded-project-file.type';

// VI: Controller du an/anh du an duoc bao ve JWT va dua ownership check xuong service.
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects(@CurrentUser() user: JwtPayload, @Query() query: ListProjectsDto) {
    return this.projectsService.listProjects(user, query);
  }

  @Post()
  createProject(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(user, dto);
  }

  @Get(':projectId')
  getProject(@CurrentUser() user: JwtPayload, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.getProject(user, projectId);
  }

  @Patch(':projectId')
  updateProject(@CurrentUser() user: JwtPayload, @Param('projectId', ParseIntPipe) projectId: number, @Body() dto: UpdateProjectDto) {
    return this.projectsService.updateProject(user, projectId, dto);
  }

  @Delete(':projectId')
  archiveProject(@CurrentUser() user: JwtPayload, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.archiveProject(user, projectId);
  }

  @Get(':projectId/images')
  listImages(@CurrentUser() user: JwtPayload, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.listImages(user, projectId);
  }

  @Post(':projectId/images')
  createImage(@CurrentUser() user: JwtPayload, @Param('projectId', ParseIntPipe) projectId: number, @Body() dto: CreateProjectImageDto) {
    return this.projectsService.createImage(user, projectId, dto);
  }

  @Post(':projectId/images/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  // VI: Upload anh that cho du an; service se validate file va ownership truoc khi luu metadata.
  uploadImage(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @UploadedFile() file: UploadedProjectFile | undefined,
    @Body() dto: UploadProjectImageDto,
  ) {
    return this.projectsService.uploadImage(user, projectId, file, dto);
  }

  @Get(':projectId/images/:imageId/regions')
  listRegions(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.projectsService.listRegions(user, projectId, imageId);
  }

  @Post(':projectId/images/:imageId/regions')
  // VI: Tao region va pane yeu cau JWT; service kiem tra owner, image thuoc project va chong chong lan.
  createRegion(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: CreateGlassRegionDto,
  ) {
    return this.projectsService.createRegion(user, projectId, imageId, dto);
  }

  @Patch(':projectId/images/:imageId')
  updateImage(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: UpdateProjectImageDto,
  ) {
    return this.projectsService.updateImage(user, projectId, imageId, dto);
  }

  @Delete(':projectId/images/:imageId')
  deleteImage(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.projectsService.deleteImage(user, projectId, imageId);
  }
}
