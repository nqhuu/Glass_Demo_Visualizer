import { ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { JwtPayload } from '../auth/auth.types';
import { UserRole } from '../users/user-role.enum';
import { CreateProjectImageDto } from './dto/create-project-image.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectImageDto } from './dto/update-project-image.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from './enums/project-status.enum';
import { ProjectImage } from './project-image.entity';
import { Project } from './project.entity';

// VI: Service quan ly du an va metadata anh, luon kiem tra owner truoc khi tra du lieu.
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectImage)
    private readonly imagesRepository: Repository<ProjectImage>,
  ) {}

  async listProjects(user: JwtPayload, query: ListProjectsDto): Promise<Project[]> {
    try {
      const where = this.buildProjectWhere(user, query);

      return await this.projectsRepository.find({
        where,
        relations: { images: true },
        order: { updatedAt: 'DESC' },
      });
    } catch (error) {
      this.logAndThrow('listProjects', 'Unable to load projects.', error, { userId: user.sub });
    }
  }

  async getProject(user: JwtPayload, projectId: number): Promise<Project> {
    const project = await this.findAccessibleProject(user, projectId, true);
    return project;
  }

  async createProject(user: JwtPayload, dto: CreateProjectDto): Promise<Project> {
    try {
      const project = this.projectsRepository.create({
        ownerId: user.sub,
        name: dto.name.trim(),
        code: this.nullableText(dto.code),
        description: this.nullableText(dto.description),
        customerName: this.nullableText(dto.customerName),
        customerPhone: this.nullableText(dto.customerPhone),
        location: this.nullableText(dto.location),
        notes: this.nullableText(dto.notes),
        status: dto.status ?? ProjectStatus.Draft,
      });

      return await this.projectsRepository.save(project);
    } catch (error) {
      this.logAndThrow('createProject', 'Unable to create project.', error, { userId: user.sub });
    }
  }

  async updateProject(user: JwtPayload, projectId: number, dto: UpdateProjectDto): Promise<Project> {
    try {
      const project = await this.findAccessibleProject(user, projectId);

      Object.assign(project, {
        name: dto.name === undefined ? project.name : dto.name.trim(),
        code: dto.code === undefined ? project.code : this.nullableText(dto.code),
        description: dto.description === undefined ? project.description : this.nullableText(dto.description),
        customerName: dto.customerName === undefined ? project.customerName : this.nullableText(dto.customerName),
        customerPhone: dto.customerPhone === undefined ? project.customerPhone : this.nullableText(dto.customerPhone),
        location: dto.location === undefined ? project.location : this.nullableText(dto.location),
        notes: dto.notes === undefined ? project.notes : this.nullableText(dto.notes),
        status: dto.status ?? project.status,
      });

      return await this.projectsRepository.save(project);
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('updateProject', 'Unable to update project.', error, { userId: user.sub, projectId });
    }
  }

  async archiveProject(user: JwtPayload, projectId: number): Promise<Project> {
    try {
      const project = await this.findAccessibleProject(user, projectId);
      project.status = ProjectStatus.Archived;
      return await this.projectsRepository.save(project);
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('archiveProject', 'Unable to archive project.', error, { userId: user.sub, projectId });
    }
  }

  async listImages(user: JwtPayload, projectId: number): Promise<ProjectImage[]> {
    try {
      await this.findAccessibleProject(user, projectId);
      return await this.imagesRepository.find({
        where: { projectId },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('listImages', 'Unable to load project images.', error, { userId: user.sub, projectId });
    }
  }

  async createImage(user: JwtPayload, projectId: number, dto: CreateProjectImageDto): Promise<ProjectImage> {
    try {
      await this.findAccessibleProject(user, projectId);
      const image = this.imagesRepository.create({
        projectId,
        ...this.normalizeImageInput(dto),
      });

      return await this.imagesRepository.save(image);
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('createImage', 'Unable to add project image metadata.', error, { userId: user.sub, projectId });
    }
  }

  async updateImage(user: JwtPayload, projectId: number, imageId: number, dto: UpdateProjectImageDto): Promise<ProjectImage> {
    try {
      await this.findAccessibleProject(user, projectId);
      const image = await this.findProjectImage(projectId, imageId);
      Object.assign(image, this.normalizeImageInput(dto, image));

      return await this.imagesRepository.save(image);
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('updateImage', 'Unable to update project image metadata.', error, { userId: user.sub, projectId, imageId });
    }
  }

  async deleteImage(user: JwtPayload, projectId: number, imageId: number): Promise<{ deleted: true }> {
    try {
      await this.findAccessibleProject(user, projectId);
      const image = await this.findProjectImage(projectId, imageId);
      await this.imagesRepository.remove(image);
      return { deleted: true };
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('deleteImage', 'Unable to delete project image metadata.', error, { userId: user.sub, projectId, imageId });
    }
  }

  private buildProjectWhere(user: JwtPayload, query: ListProjectsDto): FindOptionsWhere<Project>[] | FindOptionsWhere<Project> {
    const ownerFilter = user.role === UserRole.Admin ? {} : { ownerId: user.sub };
    const statusFilter = query.status ? { status: query.status } : {};
    const baseWhere: FindOptionsWhere<Project> = { ...ownerFilter, ...statusFilter };

    if (!query.search) {
      return baseWhere;
    }

    const search = `%${query.search.trim()}%`;
    return [
      { ...baseWhere, name: Like(search) },
      { ...baseWhere, code: Like(search) },
      { ...baseWhere, customerName: Like(search) },
      { ...baseWhere, location: Like(search) },
    ];
  }

  private async findAccessibleProject(user: JwtPayload, projectId: number, includeImages = false): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: includeImages ? { images: true } : undefined,
    });

    if (!project) {
      throw new NotFoundException('Project was not found.');
    }

    // VI: Admin duoc xem tat ca du an; user thuong chi duoc thao tac du an cua minh.
    if (user.role !== UserRole.Admin && project.ownerId !== user.sub) {
      throw new ForbiddenException('You do not have permission to access this project.');
    }

    return project;
  }

  private async findProjectImage(projectId: number, imageId: number): Promise<ProjectImage> {
    const image = await this.imagesRepository.findOne({ where: { id: imageId, projectId } });

    if (!image) {
      throw new NotFoundException('Project image was not found.');
    }

    return image;
  }

  private normalizeImageInput(
    dto: CreateProjectImageDto | UpdateProjectImageDto,
    current?: ProjectImage,
  ): Partial<ProjectImage> {
    return {
      title: dto.title === undefined ? current?.title : dto.title.trim(),
      description: dto.description === undefined ? current?.description : this.nullableText(dto.description),
      sourceType: dto.sourceType ?? current?.sourceType,
      imageUrl: dto.imageUrl === undefined ? current?.imageUrl : this.nullableText(dto.imageUrl),
      thumbnailUrl: dto.thumbnailUrl === undefined ? current?.thumbnailUrl : this.nullableText(dto.thumbnailUrl),
      originalFileName: dto.originalFileName === undefined ? current?.originalFileName : this.nullableText(dto.originalFileName),
      width: dto.width === undefined ? current?.width : dto.width,
      height: dto.height === undefined ? current?.height : dto.height,
      sortOrder: dto.sortOrder ?? current?.sortOrder ?? 0,
    };
  }

  private nullableText(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private isExpectedAccessError(error: unknown): error is NotFoundException | ForbiddenException {
    return error instanceof NotFoundException || error instanceof ForbiddenException;
  }

  private logAndThrow(action: string, message: string, error: unknown, context?: Record<string, string | number>): never {
    const safeError = this.toSafeErrorLog(error);
    this.logger.error({
      module: 'ProjectsService',
      action,
      ...(context ?? {}),
      message,
      errorName: safeError.name,
      errorCode: safeError.code,
      errorMessage: safeError.message,
    });
    throw new InternalServerErrorException(message);
  }

  private toSafeErrorLog(error: unknown): { name: string; code?: string; message?: string } {
    if (error instanceof Error) {
      const maybeCode = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
      return {
        name: error.name,
        code: maybeCode,
        message: error.message,
      };
    }

    if (typeof error === 'object' && error !== null) {
      const record = error as { name?: unknown; code?: unknown; message?: unknown };
      return {
        name: typeof record.name === 'string' ? record.name : 'UnknownError',
        code: typeof record.code === 'string' ? record.code : undefined,
        message: typeof record.message === 'string' ? record.message : undefined,
      };
    }

    return { name: 'UnknownError' };
  }
}
