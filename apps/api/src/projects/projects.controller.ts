import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.types';
import { AssignGlassProductDto } from './dto/assign-glass-product.dto';
import { CreateGlassRegionDto } from './dto/create-glass-region.dto';
import { CreateProjectImageDto } from './dto/create-project-image.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateGlassRegionDto } from './dto/update-glass-region.dto';
import { UpdateRegionRenderPresetDto } from './dto/update-region-render-preset.dto';
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

  @Patch(':projectId/archive')
  archiveProject(@CurrentUser() user: JwtPayload, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.archiveProject(user, projectId);
  }

  @Delete(':projectId')
  // VI: Xoa du an trong MVP la archive mem, service van kiem tra owner/admin truoc khi doi trang thai.
  deleteProject(@CurrentUser() user: JwtPayload, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.deleteProject(user, projectId);
  }

  @Get(':projectId/exports')
  // VI: Lich su export yeu cau JWT va service chi tra record thuoc project dang duoc phep.
  listExports(@CurrentUser() user: JwtPayload, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.listExports(user, projectId);
  }

  @Get(':projectId/exports/:exportId')
  getExport(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('exportId', ParseIntPipe) exportId: number,
  ) {
    return this.projectsService.getExport(user, projectId, exportId);
  }

  @Get(':projectId/exports/:exportId/download')
  async downloadExport(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('exportId', ParseIntPipe) exportId: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.projectsService.downloadExport(user, projectId, exportId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return new StreamableFile(file.buffer);
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
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  // VI: Upload anh that bi gioi han tan suat; service van validate file va ownership truoc khi luu.
  uploadImage(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @UploadedFile() file: UploadedProjectFile | undefined,
    @Body() dto: UploadProjectImageDto,
  ) {
    return this.projectsService.uploadImage(user, projectId, file, dto);
  }

  @Get(':projectId/images/:imageId/file')
  // VI: File anh du an chi duoc tra sau khi JWT va ownership cua project/image da duoc xac minh.
  async getImageFile(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.projectsService.getImageFile(user, projectId, imageId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return new StreamableFile(file.buffer);
  }

  @Post(':projectId/images/:imageId/export-demo')
  @UseGuards(ThrottlerGuard)
  // VI: Export duoc gioi han tan suat va thuc hien backend de bat buoc watermark.
  exportDemoImage(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.projectsService.exportDemoImage(user, projectId, imageId);
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

  @Get(':projectId/images/:imageId/regions/:regionId')
  getRegion(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
  ) {
    return this.projectsService.getRegion(user, projectId, imageId, regionId);
  }

  @Patch(':projectId/images/:imageId/regions/:regionId/glass')
  // VI: Gan mau kinh da active cho region; service kiem tra owner va khong nhan tham so vat lieu tu client.
  assignRegionGlass(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
    @Body() dto: AssignGlassProductDto,
  ) {
    return this.projectsService.assignRegionGlass(user, projectId, imageId, regionId, dto);
  }

  @Delete(':projectId/images/:imageId/regions/:regionId/glass')
  clearRegionGlass(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
  ) {
    return this.projectsService.clearRegionGlass(user, projectId, imageId, regionId);
  }

  @Patch(':projectId/images/:imageId/regions/:regionId/render-preset')
  // VI: Doi preset render cho region da xac thuc; service ap dung percent allowlist tu preset admin.
  updateRegionRenderPreset(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
    @Body() dto: UpdateRegionRenderPresetDto,
  ) {
    return this.projectsService.updateRegionRenderPreset(user, projectId, imageId, regionId, dto);
  }

  @Patch(':projectId/images/:imageId/regions/:regionId')
  // VI: Cap nhat geometry/grid region; service regenerate pane va check overlap tren backend.
  updateRegion(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
    @Body() dto: UpdateGlassRegionDto,
  ) {
    return this.projectsService.updateRegion(user, projectId, imageId, regionId, dto);
  }

  @Delete(':projectId/images/:imageId/regions/:regionId')
  deleteRegion(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
  ) {
    return this.projectsService.deleteRegion(user, projectId, imageId, regionId);
  }

  @Post(':projectId/images/:imageId/regions/:regionId/duplicate')
  duplicateRegion(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Param('regionId', ParseIntPipe) regionId: number,
  ) {
    return this.projectsService.duplicateRegion(user, projectId, imageId, regionId);
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
