import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { GlassRegion } from './glass-region.entity';

// VI: Entity pane/cell nam ben trong mot vung kinh, luu polygon toa do chuan hoa.
@Entity('glass_region_panes')
export class GlassRegionPane {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'glass_region_id', type: 'int' })
  glassRegionId!: number;

  @ManyToOne(() => GlassRegion, (region) => region.panes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'glass_region_id' })
  region!: GlassRegion;

  @Column({ name: 'pane_code', type: 'varchar', length: 32 })
  paneCode!: string;

  @Column({ name: 'pane_points_json', type: 'json' })
  panePointsJson!: Array<{ x: number; y: number }>;

  @Column({ name: 'row_index', type: 'int', nullable: true })
  rowIndex!: number | null;

  @Column({ name: 'column_index', type: 'int', nullable: true })
  columnIndex!: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
