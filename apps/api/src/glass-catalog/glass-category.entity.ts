import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { GlassProduct } from './glass-product.entity';

// VI: Entity danh muc kinh de admin gom nhom cac san pham kinh mau.
@Entity('glass_categories')
export class GlassCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 140, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_archived', default: false })
  isArchived!: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @OneToMany(() => GlassProduct, (product) => product.category)
  products!: GlassProduct[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
