import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// VI: Render preset la profile ngu canh lap dat, ap dung chinh o cap region thay vi chi o product.
@Entity('glass_render_presets')
export class GlassRenderPreset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 160 })
  name!: string;

  @Column({ length: 80, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 800, nullable: true })
  description!: string | null;

  @Column({ name: 'default_tint_percent', type: 'int', default: 25 })
  defaultTintPercent!: number;

  @Column({ name: 'default_reflectivity_percent', type: 'int', default: 35 })
  defaultReflectivityPercent!: number;

  @Column({ name: 'default_transmission_percent', type: 'int', default: 65 })
  defaultTransmissionPercent!: number;

  @Column({ name: 'default_shadow_percent', type: 'int', default: 20 })
  defaultShadowPercent!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_archived', default: false })
  isArchived!: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
