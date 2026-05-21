import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, parse, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, FindOptionsWhere, Like, Repository } from 'typeorm';
import { JwtPayload } from '../auth/auth.types';
import { UserRole } from '../users/user-role.enum';
import { CreateGlassRegionDto } from './dto/create-glass-region.dto';
import { CreateProjectImageDto } from './dto/create-project-image.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateGlassRegionDto } from './dto/update-glass-region.dto';
import { UpdateProjectImageDto } from './dto/update-project-image.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UploadProjectImageDto } from './dto/upload-project-image.dto';
import { GlassRegionBoundaryType } from './enums/glass-region-boundary-type.enum';
import { GlassRegionGridMode } from './enums/glass-region-grid-mode.enum';
import { GlassRegionStatus } from './enums/glass-region-status.enum';
import { ProjectImageSourceType } from './enums/project-image-source-type.enum';
import { ProjectStatus } from './enums/project-status.enum';
import { generateGridPanes, polygonsOverlap, validateBoundaryPoints } from './geometry/glass-region-geometry';
import { GlassRegion } from './glass-region.entity';
import { GlassRegionPane } from './glass-region-pane.entity';
import { ProjectImage } from './project-image.entity';
import { Project } from './project.entity';
import { UploadedProjectFile } from './uploaded-project-file.type';

const DEFAULT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

interface ImageUploadValidation {
  extension: string;
  mimeType: string;
}

type SupportedImageKind = 'jpeg' | 'png' | 'webp';
type RegionPoint = { x: number; y: number };

const DUPLICATE_OFFSETS: RegionPoint[] = [
  { x: 0.035, y: 0.035 },
  { x: -0.035, y: 0.035 },
  { x: 0.035, y: -0.035 },
  { x: -0.035, y: -0.035 },
  { x: 0.07, y: 0 },
  { x: 0, y: 0.07 },
];

// VI: Service quan ly du an va metadata anh, luon kiem tra owner truoc khi tra du lieu.
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectImage)
    private readonly imagesRepository: Repository<ProjectImage>,
    @InjectRepository(GlassRegion)
    private readonly regionsRepository: Repository<GlassRegion>,
    private readonly dataSource: DataSource,
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

  async listRegions(user: JwtPayload, projectId: number, imageId: number): Promise<GlassRegion[]> {
    try {
      await this.findAccessibleProjectImage(user, projectId, imageId);
      return await this.regionsRepository.find({
        where: { projectId, projectImageId: imageId },
        relations: { panes: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC', panes: { sortOrder: 'ASC' } },
      });
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('listRegions', 'Unable to load glass regions.', error, { userId: user.sub, projectId, imageId });
    }
  }

  async getRegion(user: JwtPayload, projectId: number, imageId: number, regionId: number): Promise<GlassRegion> {
    try {
      await this.findAccessibleProjectImage(user, projectId, imageId);
      return await this.findRegion(projectId, imageId, regionId);
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('getRegion', 'Unable to load glass region.', error, { userId: user.sub, projectId, imageId, regionId });
    }
  }

  async createRegion(user: JwtPayload, projectId: number, imageId: number, dto: CreateGlassRegionDto): Promise<GlassRegion> {
    try {
      await this.findAccessibleProjectImage(user, projectId, imageId);
      const boundaryPoints = validateBoundaryPoints(dto.boundaryType, dto.boundaryPoints);
      const rows = dto.rows;
      const columns = dto.columns;
      const panes = generateGridPanes(boundaryPoints, rows, columns);

      const savedRegionId = await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        await this.assertNoRegionOverlap(manager, projectId, imageId, boundaryPoints);

        // VI: Luu region va pane trong mot transaction de tranh region khong co pane neu DB loi giua chung.
        // VI: TODO Sprint sau: them chien luoc lock/constraint manh hon khi edit/copy region chay song song nhieu request.
        const region = manager.create(GlassRegion, {
          projectId,
          projectImageId: imageId,
          name: dto.name.trim(),
          boundaryType: dto.boundaryType,
          boundaryPointsJson: boundaryPoints,
          glassProductId: null,
          gridMode: GlassRegionGridMode.RowsColumns,
          rows,
          columns,
          status: GlassRegionStatus.Unassigned,
          sortOrder: dto.sortOrder ?? 0,
        });
        const savedRegion = await manager.save(GlassRegion, region);
        const paneEntities = panes.map((pane) =>
          manager.create(GlassRegionPane, {
            glassRegionId: savedRegion.id,
            paneCode: pane.paneCode,
            panePointsJson: pane.points,
            rowIndex: pane.rowIndex,
            columnIndex: pane.columnIndex,
            sortOrder: pane.sortOrder,
          }),
        );
        await manager.save(GlassRegionPane, paneEntities);
        return savedRegion.id;
      });

      const savedRegion = await this.regionsRepository.findOne({
        where: { id: savedRegionId, projectId, projectImageId: imageId },
        relations: { panes: true },
        order: { panes: { sortOrder: 'ASC' } },
      });

      if (!savedRegion) {
        throw new InternalServerErrorException('Unable to load saved glass region.');
      }

      return savedRegion;
    } catch (error) {
      if (this.isExpectedAccessError(error) || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('createRegion', 'Unable to create glass region.', error, { userId: user.sub, projectId, imageId });
    }
  }

  async updateRegion(user: JwtPayload, projectId: number, imageId: number, regionId: number, dto: UpdateGlassRegionDto): Promise<GlassRegion> {
    try {
      await this.findAccessibleProjectImage(user, projectId, imageId);
      const current = await this.findRegion(projectId, imageId, regionId);
      const nextBoundaryType = dto.boundaryType ?? current.boundaryType;
      const nextBoundaryPoints = dto.boundaryPoints ? validateBoundaryPoints(nextBoundaryType, dto.boundaryPoints) : current.boundaryPointsJson;
      const nextRows = dto.rows ?? current.rows ?? 1;
      const nextColumns = dto.columns ?? current.columns ?? 1;
      const nextGridMode = dto.gridMode ?? current.gridMode;
      if (nextGridMode !== GlassRegionGridMode.RowsColumns) {
        throw new BadRequestException('Only rows/columns grid mode is supported in this sprint.');
      }
      const shouldRegeneratePanes = Boolean(dto.boundaryType || dto.boundaryPoints || dto.rows !== undefined || dto.columns !== undefined || dto.gridMode !== undefined);
      const panes = shouldRegeneratePanes ? generateGridPanes(nextBoundaryPoints, nextRows, nextColumns) : [];

      const savedRegionId = await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        const region = await manager.findOne(GlassRegion, {
          where: { id: regionId, projectId, projectImageId: imageId },
        });

        if (!region) {
          throw new NotFoundException('Glass region was not found.');
        }

        if (shouldRegeneratePanes) {
          await this.assertNoRegionOverlap(manager, projectId, imageId, nextBoundaryPoints, regionId);
        }

        region.name = dto.name === undefined ? region.name : dto.name.trim();
        region.boundaryType = nextBoundaryType;
        region.boundaryPointsJson = nextBoundaryPoints;
        region.gridMode = nextGridMode;
        region.rows = nextRows;
        region.columns = nextColumns;
        region.sortOrder = dto.sortOrder ?? region.sortOrder;

        const savedRegion = await manager.save(GlassRegion, region);

        if (shouldRegeneratePanes) {
          // VI: Khi geometry/grid doi, xoa pane cu va tao lai trong cung transaction de tranh lech du lieu.
          await manager.delete(GlassRegionPane, { glassRegionId: regionId });
          const paneEntities = panes.map((pane) =>
            manager.create(GlassRegionPane, {
              glassRegionId: savedRegion.id,
              paneCode: pane.paneCode,
              panePointsJson: pane.points,
              rowIndex: pane.rowIndex,
              columnIndex: pane.columnIndex,
              sortOrder: pane.sortOrder,
            }),
          );
          await manager.save(GlassRegionPane, paneEntities);
        }

        return savedRegion.id;
      });

      return await this.findRegion(projectId, imageId, savedRegionId);
    } catch (error) {
      if (this.isExpectedAccessError(error) || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('updateRegion', 'Unable to update glass region.', error, { userId: user.sub, projectId, imageId, regionId });
    }
  }

  async duplicateRegion(user: JwtPayload, projectId: number, imageId: number, regionId: number): Promise<GlassRegion> {
    try {
      await this.findAccessibleProjectImage(user, projectId, imageId);
      const original = await this.findRegion(projectId, imageId, regionId);

      const savedRegionId = await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        const existingRegions = await manager.find(GlassRegion, {
          where: { projectId, projectImageId: imageId },
        });
        const candidatePoints = this.findDuplicateBoundary(original.boundaryPointsJson, existingRegions);

        if (!candidatePoints) {
          throw new BadRequestException('No non-overlapping space is available for a duplicate region.');
        }

        const panes = generateGridPanes(candidatePoints, original.rows ?? 1, original.columns ?? 1);
        // VI: Duplicate tao region/pane moi va giu glassProductId neu cot da co san, khong them UI gan kinh Sprint 9.
        const duplicate = manager.create(GlassRegion, {
          projectId,
          projectImageId: imageId,
          name: `Copy of ${original.name}`.slice(0, 180),
          boundaryType: original.boundaryType,
          boundaryPointsJson: candidatePoints,
          glassProductId: original.glassProductId,
          gridMode: original.gridMode,
          rows: original.rows,
          columns: original.columns,
          status: original.status,
          sortOrder: original.sortOrder + 1,
        });
        const savedRegion = await manager.save(GlassRegion, duplicate);
        const paneEntities = panes.map((pane) =>
          manager.create(GlassRegionPane, {
            glassRegionId: savedRegion.id,
            paneCode: pane.paneCode,
            panePointsJson: pane.points,
            rowIndex: pane.rowIndex,
            columnIndex: pane.columnIndex,
            sortOrder: pane.sortOrder,
          }),
        );
        await manager.save(GlassRegionPane, paneEntities);
        return savedRegion.id;
      });

      return await this.findRegion(projectId, imageId, savedRegionId);
    } catch (error) {
      if (this.isExpectedAccessError(error) || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('duplicateRegion', 'Unable to duplicate glass region.', error, { userId: user.sub, projectId, imageId, regionId });
    }
  }

  async deleteRegion(user: JwtPayload, projectId: number, imageId: number, regionId: number): Promise<{ deleted: true }> {
    try {
      await this.findAccessibleProjectImage(user, projectId, imageId);
      await this.findRegion(projectId, imageId, regionId);

      await this.dataSource.transaction(async (manager) => {
        // VI: Pane co cascade, nhung xoa ro rang trong transaction giup han che du lieu mo coi tren MySQL MVP.
        await manager.delete(GlassRegionPane, { glassRegionId: regionId });
        await manager.delete(GlassRegion, { id: regionId, projectId, projectImageId: imageId });
      });

      return { deleted: true };
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('deleteRegion', 'Unable to delete glass region.', error, { userId: user.sub, projectId, imageId, regionId });
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

  private async findAccessibleProjectImage(user: JwtPayload, projectId: number, imageId: number): Promise<ProjectImage> {
    // VI: Luon xac minh owner project truoc, sau do moi chap nhan image thuoc dung project.
    await this.findAccessibleProject(user, projectId);
    return this.findProjectImage(projectId, imageId);
  }

  private async findRegion(projectId: number, imageId: number, regionId: number): Promise<GlassRegion> {
    const region = await this.regionsRepository.findOne({
      where: { id: regionId, projectId, projectImageId: imageId },
      relations: { panes: true },
      order: { panes: { sortOrder: 'ASC' } },
    });

    if (!region) {
      throw new NotFoundException('Glass region was not found.');
    }

    return region;
  }

  private async assertNoRegionOverlap(
    manager: EntityManager,
    projectId: number,
    imageId: number,
    boundaryPoints: RegionPoint[],
    excludedRegionId?: number,
  ): Promise<void> {
    const existingRegions = await manager.find(GlassRegion, {
      where: { projectId, projectImageId: imageId },
    });
    const overlapsExisting = existingRegions
      .filter((region) => region.id !== excludedRegionId)
      .some((region) => polygonsOverlap(boundaryPoints, region.boundaryPointsJson));

    if (overlapsExisting) {
      throw new BadRequestException('Region overlaps another region.');
    }
  }

  private findDuplicateBoundary(originalPoints: RegionPoint[], existingRegions: GlassRegion[]): RegionPoint[] | null {
    for (const offset of DUPLICATE_OFFSETS) {
      const shifted = originalPoints.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y }));
      if (!this.pointsAreInsideImage(shifted)) {
        continue;
      }

      const candidate = validateBoundaryPoints(this.inferBoundaryTypeFromPoints(shifted), shifted);
      const overlapsExisting = existingRegions.some((region) => polygonsOverlap(candidate, region.boundaryPointsJson));
      if (!overlapsExisting) {
        return candidate;
      }
    }

    return null;
  }

  private pointsAreInsideImage(points: RegionPoint[]): boolean {
    return points.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
  }

  private inferBoundaryTypeFromPoints(points: RegionPoint[]): GlassRegionBoundaryType {
    const [topLeft, topRight, bottomRight, bottomLeft] = points;
    const isRectangle =
      Math.abs(topLeft.y - topRight.y) < 0.001 &&
      Math.abs(bottomLeft.y - bottomRight.y) < 0.001 &&
      Math.abs(topLeft.x - bottomLeft.x) < 0.001 &&
      Math.abs(topRight.x - bottomRight.x) < 0.001;
    return isRectangle ? GlassRegionBoundaryType.Rectangle : GlassRegionBoundaryType.Quadrilateral;
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
