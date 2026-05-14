import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { GlassCategory } from './glass-category.entity';
import { GlassMaterialType } from './enums/glass-material-type.enum';
import { GlassRealismPreset } from './enums/glass-realism-preset.enum';

// VI: Entity san pham kinh gom profile vat lieu de ve sau gan vao vung kinh.
@Entity('glass_products')
export class GlassProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 160 })
  name!: string;

  @Column({ length: 80, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 800, nullable: true })
  description!: string | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId!: number | null;

  @ManyToOne(() => GlassCategory, (category) => category.products, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category!: GlassCategory | null;

  @Column({ name: 'material_type', type: 'enum', enum: GlassMaterialType, default: GlassMaterialType.Clear })
  materialType!: GlassMaterialType;

  @Column({ name: 'base_color', length: 7, default: '#dbeafe' })
  baseColor!: string;

  @Column({ name: 'tint_strength', type: 'float', default: 0.25 })
  tintStrength!: number;

  @Column({ name: 'reflectivity_level', type: 'float', default: 0.35 })
  reflectivityLevel!: number;

  @Column({ name: 'transmission_level', type: 'float', default: 0.65 })
  transmissionLevel!: number;

  @Column({ name: 'shadow_level', type: 'float', default: 0.2 })
  shadowLevel!: number;

  @Column({ name: 'realism_preset', type: 'enum', enum: GlassRealismPreset, default: GlassRealismPreset.Standard })
  realismPreset!: GlassRealismPreset;

  @Column({ name: 'preview_image_url', type: 'varchar', length: 500, nullable: true })
  previewImageUrl!: string | null;

  @Column({ name: 'texture_image_url', type: 'varchar', length: 500, nullable: true })
  textureImageUrl!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
