import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProjectExportStatus } from './enums/project-export-status.enum';
import { ProjectImage } from './project-image.entity';
import { Project } from './project.entity';

// VI: Entity luu metadata file export; storageKey la duong dan tuong doi noi bo, khong tra ve absolute path.
@Entity('project_exports')
export class ProjectExport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId!: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'project_image_id', type: 'int' })
  projectImageId!: number;

  @ManyToOne(() => ProjectImage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_image_id' })
  projectImage!: ProjectImage;

  @Column({ name: 'created_by_id', type: 'int' })
  createdById!: number;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey!: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize!: number;

  @Column({ type: 'int' })
  width!: number;

  @Column({ type: 'int' })
  height!: number;

  @Column({ type: 'varchar', length: 20 })
  format!: string;

  @Column({ name: 'watermark_applied', type: 'boolean', default: true })
  watermarkApplied!: boolean;

  @Column({ name: 'copyright_text', type: 'varchar', length: 300, nullable: true })
  copyrightText!: string | null;

  @Column({ type: 'enum', enum: ProjectExportStatus, default: ProjectExportStatus.Completed })
  status!: ProjectExportStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
