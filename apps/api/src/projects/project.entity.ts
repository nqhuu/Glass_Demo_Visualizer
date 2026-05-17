import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { ProjectStatus } from './enums/project-status.enum';
import { ProjectImage } from './project-image.entity';

// VI: Entity du an cua user, moi du an co the chua nhieu anh cong trinh.
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id', type: 'int' })
  ownerId!: number;

  @ManyToOne(() => User, (user) => user.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ type: 'varchar', length: 180 })
  name!: string;

  // VI: Truong nullable can khai bao type ro rang de TypeORM khong suy luan Object tren MySQL.
  @Column({ type: 'varchar', length: 120, nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 1200, nullable: true })
  description!: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 180, nullable: true })
  customerName!: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 40, nullable: true })
  customerPhone!: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 1200, nullable: true })
  notes!: string | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.Draft })
  status!: ProjectStatus;

  @OneToMany(() => ProjectImage, (image) => image.project)
  images!: ProjectImage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
