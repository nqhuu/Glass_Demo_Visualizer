import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProjectImage } from './project-image.entity';
import { Project } from './project.entity';
import { GlassRegionBoundaryType } from './enums/glass-region-boundary-type.enum';
import { GlassRegionGridMode } from './enums/glass-region-grid-mode.enum';
import { GlassRegionStatus } from './enums/glass-region-status.enum';
import { GlassRegionPane } from './glass-region-pane.entity';

// VI: Entity vung kinh tren mot anh du an; Sprint 7 luu hinh hoc va pane, chua gan mau kinh.
@Entity('glass_regions')
export class GlassRegion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId!: number;

  @ManyToOne(() => Project, (project) => project.glassRegions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'project_image_id', type: 'int' })
  projectImageId!: number;

  @ManyToOne(() => ProjectImage, (image) => image.glassRegions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_image_id' })
  projectImage!: ProjectImage;

  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ name: 'boundary_type', type: 'enum', enum: GlassRegionBoundaryType })
  boundaryType!: GlassRegionBoundaryType;

  @Column({ name: 'boundary_points_json', type: 'json' })
  boundaryPointsJson!: Array<{ x: number; y: number }>;

  @Column({ name: 'glass_product_id', type: 'int', nullable: true })
  glassProductId!: number | null;

  @Column({ name: 'grid_mode', type: 'enum', enum: GlassRegionGridMode, default: GlassRegionGridMode.RowsColumns })
  gridMode!: GlassRegionGridMode;

  @Column({ type: 'int', nullable: true })
  rows!: number | null;

  @Column({ type: 'int', nullable: true })
  columns!: number | null;

  @Column({ type: 'enum', enum: GlassRegionStatus, default: GlassRegionStatus.Unassigned })
  status!: GlassRegionStatus;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @OneToMany(() => GlassRegionPane, (pane) => pane.region, { cascade: true })
  panes!: GlassRegionPane[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
