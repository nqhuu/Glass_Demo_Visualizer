import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.types';
import { CreateProjectImageDto } from './dto/create-project-image.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectImageDto } from './dto/update-project-image.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

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
