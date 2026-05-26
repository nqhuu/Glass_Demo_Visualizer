import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProjectImageSourceType } from './enums/project-image-source-type.enum';
import { GlassRegion } from './glass-region.entity';
import { Project } from './project.entity';

// VI: Entity anh thuoc du an; file upload dung storage key noi bo va URL API duoc bao ve.
@Entity('project_images')
export class ProjectImage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId!: number;

  @ManyToOne(() => Project, (project) => project.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'varchar', length: 800, nullable: true })
  description!: string | null;

  @Column({ name: 'source_type', type: 'enum', enum: ProjectImageSourceType, default: ProjectImageSourceType.Placeholder })
  sourceType!: ProjectImageSourceType;

  @Column({ name: 'image_url', type: 'varchar', length: 700, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 700, nullable: true })
  thumbnailUrl!: string | null;

  // VI: Khoa luu tru do server tao, an khoi response mac dinh de khong lo cau truc file noi bo.
  @Column({ name: 'storage_key', type: 'varchar', length: 700, nullable: true, select: false })
  storageKey!: string | null;

  @Column({ name: 'original_file_name', type: 'varchar', length: 255, nullable: true })
  originalFileName!: string | null;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @OneToMany(() => GlassRegion, (region) => region.projectImage)
  glassRegions!: GlassRegion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
