import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, parse, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, FindOptionsWhere, Like, Repository } from 'typeorm';
import { JwtPayload } from '../auth/auth.types';
import { GlassProduct } from '../glass-catalog/glass-product.entity';
import { UserRole } from '../users/user-role.enum';
import { AssignGlassProductDto } from './dto/assign-glass-product.dto';
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
import { ProjectExportStatus } from './enums/project-export-status.enum';
import { ProjectStatus } from './enums/project-status.enum';
import { generateGridPanes, polygonsOverlap, validateBoundaryPoints } from './geometry/glass-region-geometry';
import { GlassRegion } from './glass-region.entity';
import { GlassRegionPane } from './glass-region-pane.entity';
import { ProjectExport } from './project-export.entity';
import { ProjectImage } from './project-image.entity';
import { Project } from './project.entity';
import { UploadedProjectFile } from './uploaded-project-file.type';

const DEFAULT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

interface ImageUploadValidation {
  extension: string;
  mimeType: string;
}

interface ExportImageSource {
  dataUri: string;
  width: number;
  height: number;
}

export interface ProjectExportResponse {
  id: number;
  projectId: number;
  projectImageId: number;
  createdById: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  format: string;
  watermarkApplied: boolean;
  copyrightText: string | null;
  status: ProjectExportStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectExportDownload {
  fileName: string;
  contentType: string;
  buffer: Buffer;
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
    @InjectRepository(ProjectExport)
    private readonly exportsRepository: Repository<ProjectExport>,
    @InjectRepository(GlassProduct)
    private readonly glassProductsRepository: Repository<GlassProduct>,
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
        relations: { panes: true, glassProduct: { category: true } },
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

  async assignRegionGlass(user: JwtPayload, projectId: number, imageId: number, regionId: number, dto: AssignGlassProductDto): Promise<GlassRegion> {
    try {
      await this.findAccessibleProjectImage(user, projectId, imageId);
      const product = await this.findActiveGlassProduct(dto.glassProductId);

      await this.dataSource.transaction(async (manager) => {
        const region = await manager.findOne(GlassRegion, {
          where: { id: regionId, projectId, projectImageId: imageId },
        });

        if (!region) {
          throw new NotFoundException('Glass region was not found.');
        }

        // VI: Sprint 9 chi luu id san pham active; user khong duoc gui/sua cac thong so vat lieu.
        region.glassProductId = product.id;
        region.status = GlassRegionStatus.Assigned;
        await manager.save(GlassRegion, region);
      });

      return await this.findRegion(projectId, imageId, regionId);
    } catch (error) {
      if (this.isExpectedAccessError(error) || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('assignRegionGlass', 'Unable to assign glass product.', error, { userId: user.sub, projectId, imageId, regionId, productId: dto.glassProductId });
    }
  }

  async clearRegionGlass(user: JwtPayload, projectId: number, imageId: number, regionId: number): Promise<GlassRegion> {
    try {
      await this.findAccessibleProjectImage(user, projectId, imageId);

      await this.dataSource.transaction(async (manager) => {
        const region = await manager.findOne(GlassRegion, {
          where: { id: regionId, projectId, projectImageId: imageId },
        });

        if (!region) {
          throw new NotFoundException('Glass region was not found.');
        }

        // VI: Go mau kinh khong xoa geometry/pane; region quay ve trang thai chua gan.
        region.glassProductId = null;
        region.status = GlassRegionStatus.Unassigned;
        await manager.save(GlassRegion, region);
      });

      return await this.findRegion(projectId, imageId, regionId);
    } catch (error) {
      if (this.isExpectedAccessError(error) || error instanceof BadRequestException) {
        throw error;
      }
      this.logAndThrow('clearRegionGlass', 'Unable to remove glass assignment.', error, { userId: user.sub, projectId, imageId, regionId });
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
        relations: { panes: true, glassProduct: { category: true } },
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

  async exportDemoImage(user: JwtPayload, projectId: number, imageId: number): Promise<ProjectExportResponse> {
    let exportFilePath: string | null = null;
    let exportRecordCommitted = false;

    try {
      // VI: Export bat buoc chay o backend de watermark khong bi client bo qua.
      const image = await this.findAccessibleProjectImage(user, projectId, imageId);
      const assignedRegions = await this.loadAssignedRegionsForExport(projectId, imageId);
      if (assignedRegions.length === 0) {
        throw new BadRequestException('At least one assigned glass region is required before export.');
      }

      const originalImage = await this.readUploadedImageSource(image.imageUrl);
      const width = originalImage.width;
      const height = originalImage.height;
      const copyrightText = this.configService.get<string>('EXPORT_COPYRIGHT_TEXT') ?? `© ${new Date().getFullYear()} GlassDemo. All rights reserved.`;
      const svg = this.renderExportSvg({
        originalDataUri: originalImage.dataUri,
        width,
        height,
        regions: assignedRegions,
        copyrightText,
      });

      const exportId = randomUUID();
      const storageKey = `projects/${projectId}/${exportId}.svg`;
      const exportRoot = this.resolveExportStorageKey(`projects/${projectId}`);
      exportFilePath = this.resolveExportStorageKey(storageKey);
      await mkdir(exportRoot, { recursive: true });
      await writeFile(exportFilePath, svg, 'utf8');
      const fileStats = await stat(exportFilePath);

      const saved = await this.dataSource.transaction(async (manager) => {
        const exportsRepository = manager.getRepository(ProjectExport);
        const exportRecord = exportsRepository.create({
          projectId,
          projectImageId: imageId,
          createdById: user.sub,
          fileUrl: '',
          fileName: `glass-demo-${exportId}.svg`,
          storageKey,
          fileSize: fileStats.size,
          width,
          height,
          format: 'svg',
          watermarkApplied: true,
          copyrightText,
          status: ProjectExportStatus.Completed,
        });

        // VI: Chi commit record sau khi gan URL download dung id; khong luu URL /exports/0 bi hong.
        const created = await exportsRepository.save(exportRecord);
        created.fileUrl = `/api/projects/${projectId}/exports/${created.id}/download`;
        return exportsRepository.save(created);
      });

      // VI: TODO Sprint 11: ap dung rate limit export bang throttler khi module bao mat duoc them.
      exportRecordCommitted = true;
      return this.toExportResponse(saved);
    } catch (error) {
      if (exportFilePath && !exportRecordCommitted) {
        await this.removeStoredFile(exportFilePath);
      }
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('exportDemoImage', 'Unable to export demo image.', error, { userId: user.sub, projectId, imageId });
    }
  }

  async listExports(user: JwtPayload, projectId: number): Promise<ProjectExportResponse[]> {
    try {
      await this.findAccessibleProject(user, projectId);
      const exports = await this.exportsRepository.find({
        where: { projectId },
        order: { createdAt: 'DESC' },
      });
      return exports.map((exportRecord) => this.toExportResponse(exportRecord));
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('listExports', 'Unable to load export history.', error, { userId: user.sub, projectId });
    }
  }

  async getExport(user: JwtPayload, projectId: number, exportId: number): Promise<ProjectExportResponse> {
    try {
      await this.findAccessibleProject(user, projectId);
      return this.toExportResponse(await this.findProjectExport(projectId, exportId));
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('getExport', 'Unable to load export record.', error, { userId: user.sub, projectId, exportId });
    }
  }

  async downloadExport(user: JwtPayload, projectId: number, exportId: number): Promise<ProjectExportDownload> {
    try {
      await this.findAccessibleProject(user, projectId);
      const exportRecord = await this.findProjectExport(projectId, exportId);
      const buffer = await readFile(this.resolveExportStorageKey(exportRecord.storageKey));
      return {
        fileName: exportRecord.fileName,
        contentType: exportRecord.format === 'svg' ? 'image/svg+xml' : 'application/octet-stream',
        buffer,
      };
    } catch (error) {
      if (this.isExpectedAccessError(error)) {
        throw error;
      }
      this.logAndThrow('downloadExport', 'Unable to download export file.', error, { userId: user.sub, projectId, exportId });
    }
  }

  private async loadAssignedRegionsForExport(projectId: number, imageId: number): Promise<GlassRegion[]> {
    return this.regionsRepository.find({
      where: { projectId, projectImageId: imageId, status: GlassRegionStatus.Assigned },
      relations: { panes: true, glassProduct: { category: true } },
      order: { sortOrder: 'ASC', createdAt: 'ASC', panes: { sortOrder: 'ASC' } },
    }).then((regions) => regions.filter((region) => region.glassProduct && region.panes.length > 0));
  }

  private async readUploadedImageSource(imageUrl: string | null): Promise<ExportImageSource> {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
      throw new BadRequestException('Only uploaded project images can be exported in this MVP.');
    }

    const storageKey = imageUrl.slice('/uploads/'.length);
    const filePath = this.resolveStorageKey(storageKey);
    const mimeType = this.getImageMimeType(filePath);
    const buffer = await readFile(filePath);
    const dimensions = this.getStoredImageDimensions(buffer, mimeType);

    return {
      dataUri: `data:${mimeType};base64,${buffer.toString('base64')}`,
      ...dimensions,
    };
  }

  private renderExportSvg(input: {
    originalDataUri: string;
    width: number;
    height: number;
    regions: GlassRegion[];
    copyrightText: string;
  }): string {
    const minDimension = Math.min(input.width, input.height);
    const paneBorderWidth = Math.max(0.8, minDimension * 0.0018);
    const defs: string[] = [
      `<linearGradient id="watermark-glow" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="1" stop-color="#111827" stop-opacity="0.25"/></linearGradient>`,
    ];
    const paneMarkup: string[] = [];

    input.regions.forEach((region, regionIndex) => {
      const product = region.glassProduct;
      if (!product) {
        return;
      }

      const material = this.getExportMaterial(product);
      region.panes.forEach((pane, paneIndex) => {
        const clipId = `clip-r${region.id}-p${pane.id}`;
        const gradientId = `glass-r${region.id}-p${pane.id}`;
        // VI: Diem normalized cua editor duoc doi sang pixel anh goc tren tung truc de khop dung geometry.
        const points = this.toSvgPoints(pane.panePointsJson, input.width, input.height);
        const opacity = Math.min(0.48, Math.max(0.12, product.tintStrength + product.reflectivityLevel * 0.12));
        const shadowOpacity = Math.min(0.28, Math.max(0.04, product.shadowLevel));

        defs.push(
          `<clipPath id="${clipId}"><polygon points="${points}"/></clipPath>`,
          `<linearGradient id="${gradientId}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="${material.highlight}"/><stop offset="0.42" stop-color="${material.color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="#0f172a" stop-opacity="${shadowOpacity}"/></linearGradient>`,
        );

        paneMarkup.push(
          `<g clip-path="url(#${clipId})">`,
          `<polygon points="${points}" fill="url(#${gradientId})"/>`,
          this.renderMaterialDetail(product.materialType, material.color, clipId, regionIndex, paneIndex, input.width, input.height),
          `<path d="${this.toSvgPath(pane.panePointsJson, input.width, input.height)}" fill="none" stroke="#ffffff" stroke-opacity="0.44" stroke-width="${paneBorderWidth.toFixed(2)}"/>`,
          `<path d="${this.toSvgPath(pane.panePointsJson, input.width, input.height)}" fill="none" stroke="${material.edge}" stroke-opacity="0.5" stroke-width="${Math.max(0.5, paneBorderWidth / 2).toFixed(2)}"/>`,
          `</g>`,
        );
      });
    });

    // VI: SVG giu dung ti le anh goc, tranh keo dan anh lam sai vi tri vung/pane da chinh.
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" role="img">`,
      `<defs>${defs.join('')}</defs>`,
      `<image href="${input.originalDataUri}" x="0" y="0" width="${input.width}" height="${input.height}"/>`,
      paneMarkup.join(''),
      this.renderWatermark(input.copyrightText, input.width, input.height),
      `</svg>`,
    ].join('');
  }

  private renderMaterialDetail(materialType: string, color: string, clipId: string, regionIndex: number, paneIndex: number, width: number, height: number): string {
    const minDimension = Math.min(width, height);
    if (materialType === 'frosted') {
      return `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" opacity="0.18" clip-path="url(#${clipId})"/>`;
    }

    if (materialType === 'patterned') {
      const patternId = `pattern-${regionIndex}-${paneIndex}`;
      const patternSize = Math.max(16, minDimension * 0.036);
      return [
        `<defs><pattern id="${patternId}" width="${patternSize.toFixed(2)}" height="${patternSize.toFixed(2)}" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">`,
        `<path d="M0 ${(patternSize / 2).toFixed(2)} H${patternSize.toFixed(2)}" stroke="${color}" stroke-opacity="0.18" stroke-width="${Math.max(1, patternSize * 0.08).toFixed(2)}"/>`,
        `<path d="M0 ${(patternSize * 0.88).toFixed(2)} H${patternSize.toFixed(2)}" stroke="#ffffff" stroke-opacity="0.16" stroke-width="${Math.max(0.6, patternSize * 0.03).toFixed(2)}"/>`,
        `</pattern></defs>`,
        `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${patternId})" clip-path="url(#${clipId})"/>`,
      ].join('');
    }

    if (materialType === 'reflective') {
      return [
        `<path d="M${(-width * 0.08).toFixed(2)} ${(height * 0.24).toFixed(2)} L${(width * 0.52).toFixed(2)} ${(-height * 0.12).toFixed(2)} L${(width * 0.59).toFixed(2)} ${(-height * 0.06).toFixed(2)} L${(-width * 0.01).toFixed(2)} ${(height * 0.3).toFixed(2)} Z" fill="#ffffff" opacity="0.14" clip-path="url(#${clipId})"/>`,
        `<path d="M${(width * 0.38).toFixed(2)} ${(height * 1.08).toFixed(2)} L${(width * 1.08).toFixed(2)} ${(height * 0.38).toFixed(2)} L${(width * 1.13).toFixed(2)} ${(height * 0.43).toFixed(2)} L${(width * 0.43).toFixed(2)} ${(height * 1.13).toFixed(2)} Z" fill="#ffffff" opacity="0.11" clip-path="url(#${clipId})"/>`,
      ].join('');
    }

    return `<path d="M${(-width * 0.04).toFixed(2)} ${(height * 0.12).toFixed(2)} L${(width * 1.02).toFixed(2)} ${(height * 0.04).toFixed(2)}" stroke="#ffffff" stroke-opacity="0.16" stroke-width="${Math.max(10, minDimension * 0.02).toFixed(2)}" clip-path="url(#${clipId})"/>`;
  }

  private renderWatermark(copyrightText: string, width: number, height: number): string {
    const safeCopyright = this.escapeXml(copyrightText);
    const minDimension = Math.min(width, height);
    const stampFontSize = Math.max(18, Math.round(minDimension * 0.026));
    const copyrightFontSize = Math.max(11, Math.round(minDimension * 0.013));
    const badgeHeight = Math.max(38, Math.round(minDimension * 0.056));
    const badgeWidth = Math.min(Math.round(width * 0.4), Math.round(badgeHeight * 4.9));
    const margin = Math.max(12, Math.round(minDimension * 0.022));
    const badgeX = width - badgeWidth - margin;
    const badgeY = height - badgeHeight - margin - copyrightFontSize;
    return [
      `<g opacity="0.14" transform="rotate(-32 ${(width / 2).toFixed(2)} ${(height / 2).toFixed(2)})">`,
      `<text x="${(width * 0.08).toFixed(2)}" y="${(height * 0.21).toFixed(2)}" fill="#ffffff" font-size="${stampFontSize}" font-family="Arial, sans-serif">GlassDemo</text>`,
      `<text x="${(width * 0.36).toFixed(2)}" y="${(height * 0.52).toFixed(2)}" fill="#ffffff" font-size="${stampFontSize}" font-family="Arial, sans-serif">GlassDemo</text>`,
      `<text x="${(width * 0.63).toFixed(2)}" y="${(height * 0.83).toFixed(2)}" fill="#ffffff" font-size="${stampFontSize}" font-family="Arial, sans-serif">GlassDemo</text>`,
      `</g>`,
      `<g transform="translate(${badgeX} ${badgeY})">`,
      `<rect x="0" y="0" width="${badgeWidth}" height="${badgeHeight}" rx="${Math.max(6, Math.round(badgeHeight * 0.18))}" fill="#111827" opacity="0.48"/>`,
      `<path d="M${(badgeHeight * 0.28).toFixed(2)} ${(badgeHeight * 0.28).toFixed(2)} L${(badgeHeight * 0.5).toFixed(2)} ${(badgeHeight * 0.15).toFixed(2)} L${(badgeHeight * 0.72).toFixed(2)} ${(badgeHeight * 0.34).toFixed(2)} L${(badgeHeight * 0.72).toFixed(2)} ${(badgeHeight * 0.72).toFixed(2)} L${(badgeHeight * 0.5).toFixed(2)} ${(badgeHeight * 0.87).toFixed(2)} L${(badgeHeight * 0.28).toFixed(2)} ${(badgeHeight * 0.68).toFixed(2)} Z" fill="none" stroke="#ffffff" stroke-width="${Math.max(2, badgeHeight * 0.08).toFixed(2)}" opacity="0.9"/>`,
      `<text x="${(badgeHeight * 0.9).toFixed(2)}" y="${(badgeHeight * 0.64).toFixed(2)}" fill="#ffffff" font-size="${Math.max(14, badgeHeight * 0.48).toFixed(2)}" font-weight="700" font-family="Arial, sans-serif">GlassDemo</text>`,
      `</g>`,
      `<text x="${width - margin}" y="${height - margin}" text-anchor="end" fill="#ffffff" fill-opacity="0.82" font-size="${copyrightFontSize}" font-family="Arial, sans-serif">${safeCopyright}</text>`,
    ].join('');
  }

  private getExportMaterial(product: GlassProduct): { color: string; edge: string; highlight: number } {
    return {
      color: this.isSafeHexColor(product.baseColor) ? product.baseColor : '#dbeafe',
      edge: product.materialType === 'reflective' ? '#e0f2fe' : '#ffffff',
      highlight: product.materialType === 'clear' ? 0.22 : 0.34,
    };
  }

  private toSvgPoints(points: RegionPoint[], width: number, height: number): string {
    return points.map((point) => `${this.toSvgCoord(point.x, width)},${this.toSvgCoord(point.y, height)}`).join(' ');
  }

  private toSvgPath(points: RegionPoint[], width: number, height: number): string {
    return `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${this.toSvgCoord(point.x, width)} ${this.toSvgCoord(point.y, height)}`).join(' ')} Z`;
  }

  private toSvgCoord(value: number, scale: number): string {
    return (Math.min(1, Math.max(0, value)) * scale).toFixed(2);
  }

  private getImageMimeType(filePath: string): string {
    const extension = extname(filePath).toLowerCase();
    if (extension === '.jpg' || extension === '.jpeg') {
      return 'image/jpeg';
    }
    if (extension === '.png') {
      return 'image/png';
    }
    if (extension === '.webp') {
      return 'image/webp';
    }
    throw new BadRequestException('Export image type is not supported.');
  }

  private getStoredImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } {
    // VI: Export doc header file goc da luu de khong tin width/height metadata do client co the sua.
    const dimensions =
      mimeType === 'image/png'
        ? this.readPngDimensions(buffer)
        : mimeType === 'image/jpeg'
          ? this.readJpegDimensions(buffer)
          : mimeType === 'image/webp'
            ? this.readWebpDimensions(buffer)
            : null;

    if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
      throw new BadRequestException('Unable to determine export image dimensions.');
    }

    return dimensions;
  }

  private readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (buffer.length < 24 || this.detectImageSignature(buffer) !== 'png') {
      return null;
    }
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  private readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (this.detectImageSignature(buffer) !== 'jpeg') {
      return null;
    }

    const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      if (startOfFrameMarkers.has(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }

      const segmentLength = buffer.readUInt16BE(offset + 2);
      if (segmentLength < 2) {
        return null;
      }
      offset += segmentLength + 2;
    }
    return null;
  }

  private readWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (buffer.length < 30 || this.detectImageSignature(buffer) !== 'webp') {
      return null;
    }

    const format = buffer.subarray(12, 16).toString('ascii');
    if (format === 'VP8 ') {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (format === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (format === 'VP8X') {
      return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
    }
    return null;
  }

  private isSafeHexColor(value: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(value);
  }

  private escapeXml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  }

  private toExportResponse(exportRecord: ProjectExport): ProjectExportResponse {
    return {
      id: exportRecord.id,
      projectId: exportRecord.projectId,
      projectImageId: exportRecord.projectImageId,
      createdById: exportRecord.createdById,
      fileUrl: exportRecord.fileUrl,
      fileName: exportRecord.fileName,
      fileSize: exportRecord.fileSize,
      width: exportRecord.width,
      height: exportRecord.height,
      format: exportRecord.format,
      watermarkApplied: exportRecord.watermarkApplied,
      copyrightText: exportRecord.copyrightText,
      status: exportRecord.status,
      createdAt: exportRecord.createdAt,
      updatedAt: exportRecord.updatedAt,
    };
  }

  private async findProjectExport(projectId: number, exportId: number): Promise<ProjectExport> {
    const exportRecord = await this.exportsRepository.findOne({ where: { id: exportId, projectId } });
    if (!exportRecord) {
      throw new NotFoundException('Export record was not found.');
    }
    return exportRecord;
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
      relations: { panes: true, glassProduct: { category: true } },
      order: { panes: { sortOrder: 'ASC' } },
    });

    if (!region) {
      throw new NotFoundException('Glass region was not found.');
    }

    return region;
  }

  private async findActiveGlassProduct(productId: number): Promise<GlassProduct> {
    const product = await this.glassProductsRepository.findOne({
      where: { id: productId },
      relations: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Glass product was not found.');
    }

    if (!product.isActive) {
      throw new BadRequestException('Glass product is not active.');
    }

    return product;
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

  private getExportRoot(): string {
    return resolve(this.configService.get<string>('EXPORT_ROOT') ?? './exports');
  }

  private resolveStorageKey(storageKey: string): string {
    return this.resolveRelativeStorageKey(this.getUploadRoot(), storageKey);
  }

  private resolveExportStorageKey(storageKey: string): string {
    // VI: File export khong nam trong /uploads public; chi endpoint JWT moi doc tu EXPORT_ROOT.
    return this.resolveRelativeStorageKey(this.getExportRoot(), storageKey);
  }

  private resolveRelativeStorageKey(rootPath: string, storageKey: string): string {
    const normalizedKey = storageKey.replaceAll('\\', '/');
    if (normalizedKey.includes('..') || normalizedKey.startsWith('/') || normalizedKey.includes(':')) {
      throw new BadRequestException('Storage path is invalid.');
    }

    const filePath = resolve(rootPath, normalizedKey);
    if (!filePath.toLowerCase().startsWith(rootPath.toLowerCase())) {
      throw new BadRequestException('Storage path is invalid.');
    }
    return filePath;
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
