import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, parse, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { JwtPayload } from '../auth/auth.types';
import { UserRole } from '../users/user-role.enum';
import { CreateProjectImageDto } from './dto/create-project-image.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectImageDto } from './dto/update-project-image.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UploadProjectImageDto } from './dto/upload-project-image.dto';
import { ProjectImageSourceType } from './enums/project-image-source-type.enum';
import { ProjectStatus } from './enums/project-status.enum';
import { ProjectImage } from './project-image.entity';
import { Project } from './project.entity';
import { UploadedProjectFile } from './uploaded-project-file.type';

const DEFAULT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

interface ImageUploadValidation {
  extension: string;
  mimeType: string;
}

type SupportedImageKind = 'jpeg' | 'png' | 'webp';

// VI: Service quan ly du an va metadata anh, luon kiem tra owner truoc khi tra du lieu.
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectImage)
    private readonly imagesRepository: Repository<ProjectImage>,
    private readonly configService: ConfigService,
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

  async uploadImage(user: JwtPayload, projectId: number, file: UploadedProjectFile | undefined, dto: UploadProjectImageDto): Promise<ProjectImage> {
    let storedFilePath: string | null = null;

    try {
      await this.findAccessibleProject(user, projectId);
      if (!file) {
        throw new BadRequestException('Image file is required.');
      }
      const validation = this.validateUploadedImage(file);
      const uploadedFile = file;
      const uploadRoot = this.getUploadRoot();
      const originalDir = resolve(uploadRoot, 'projects', String(projectId), 'original');
      const storedFileName = `${randomUUID()}${validation.extension}`;
      storedFilePath = resolve(originalDir, storedFileName);

      if (!storedFilePath.startsWith(originalDir)) {
        throw new BadRequestException('Upload path is invalid.');
      }

      await mkdir(originalDir, { recursive: true });
      await writeFile(storedFilePath, uploadedFile.buffer);

      const publicImageUrl = `/uploads/projects/${projectId}/original/${storedFileName}`;
      const image = this.imagesRepository.create({
        projectId,
        title: this.normalizeUploadTitle(dto.title, uploadedFile.originalname),
        description: this.nullableText(dto.description),
        sourceType: ProjectImageSourceType.Uploaded,
        imageUrl: publicImageUrl,
        // VI: TODO Sprint sau: tao thumbnail rieng khi co thu vien xu ly anh nhe/on dinh.
        thumbnailUrl: null,
        originalFileName: this.safeOriginalFileName(uploadedFile.originalname),
        // VI: TODO Sprint sau: doc width/height server-side bang thu vien anh da duoc phe duyet.
        width: null,
        height: null,
        sortOrder: dto.sortOrder ?? 0,
      });

      return await this.imagesRepository.save(image);
    } catch (error) {
      if (storedFilePath) {
        await this.removeStoredFile(storedFilePath);
      }

      if (this.isExpectedAccessError(error) || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('uploadImage', 'Unable to upload project image.', error, { userId: user.sub, projectId });
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
      await this.removeProjectImageFiles(image);
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

  private validateUploadedImage(file: UploadedProjectFile | undefined): ImageUploadValidation {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    if (!file.buffer || file.size <= 0) {
      throw new BadRequestException('Image file is empty.');
    }

    const maxBytes = Number(this.configService.get<string>('UPLOAD_MAX_IMAGE_BYTES') ?? DEFAULT_UPLOAD_MAX_BYTES);
    if (file.size > maxBytes) {
      throw new BadRequestException('Image file is too large.');
    }

    const extension = extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();
    const allowed: Record<string, string[]> = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.webp': ['image/webp'],
    };

    if (!allowed[extension] || !allowed[extension].includes(mimeType)) {
      // VI: HEIC/HEIF can xu ly signature rieng o sprint sau; hien tai reject de tranh upload tuy y.
      throw new BadRequestException('Only JPG, PNG, and WEBP images are allowed.');
    }

    const signatureKind = this.detectImageSignature(file.buffer);
    if (!signatureKind || !this.isSignatureConsistent(extension, mimeType, signatureKind)) {
      throw new BadRequestException('Image file content does not match the allowed image type.');
    }

    return { extension, mimeType };
  }

  private detectImageSignature(buffer: Buffer): SupportedImageKind | null {
    // VI: Kiem tra magic number nhe de khong chi tin MIME/extension do client gui.
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }

    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'png';
    }

    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
      return 'webp';
    }

    return null;
  }

  private isSignatureConsistent(extension: string, mimeType: string, signatureKind: SupportedImageKind): boolean {
    const expectedBySignature: Record<SupportedImageKind, { extensions: string[]; mimeTypes: string[] }> = {
      jpeg: { extensions: ['.jpg', '.jpeg'], mimeTypes: ['image/jpeg'] },
      png: { extensions: ['.png'], mimeTypes: ['image/png'] },
      webp: { extensions: ['.webp'], mimeTypes: ['image/webp'] },
    };
    const expected = expectedBySignature[signatureKind];

    return expected.extensions.includes(extension) && expected.mimeTypes.includes(mimeType);
  }

  private normalizeUploadTitle(title: string | undefined, originalName: string): string {
    const trimmedTitle = title?.trim();
    if (trimmedTitle) {
      return trimmedTitle;
    }

    const baseName = parse(originalName).name.replace(/[^\w\s.-]/g, '').trim();
    return baseName.slice(0, 180) || 'Project image';
  }

  private safeOriginalFileName(originalName: string): string {
    return originalName.replace(/[^\w\s.-]/g, '').trim().slice(0, 255) || 'uploaded-image';
  }

  private getUploadRoot(): string {
    return resolve(this.configService.get<string>('UPLOAD_ROOT') ?? './uploads');
  }

  private async removeStoredFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error) {
      this.logger.warn({
        module: 'ProjectsService',
        action: 'removeStoredFile',
        message: 'Unable to clean up uploaded file after failed save',
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  private async removeProjectImageFiles(image: ProjectImage): Promise<void> {
    if (image.sourceType !== ProjectImageSourceType.Uploaded) {
      return;
    }

    await Promise.all([this.removePublicUploadUrl(image.imageUrl), this.removePublicUploadUrl(image.thumbnailUrl)]);
  }

  private async removePublicUploadUrl(url: string | null): Promise<void> {
    if (!url?.startsWith('/uploads/')) {
      return;
    }

    const relativePath = url.replace(/^\/uploads\//, '');
    const uploadRoot = this.getUploadRoot();
    const filePath = resolve(uploadRoot, relativePath);

    if (!filePath.startsWith(uploadRoot)) {
      return;
    }

    await this.removeStoredFile(filePath);
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
        message: 'Project operation failed.',
      };
    }

    if (typeof error === 'object' && error !== null) {
      const record = error as { name?: unknown; code?: unknown; message?: unknown };
      return {
        name: typeof record.name === 'string' ? record.name : 'UnknownError',
        code: typeof record.code === 'string' ? record.code : undefined,
        message: 'Project operation failed.',
      };
    }

    return { name: 'UnknownError' };
  }
}
