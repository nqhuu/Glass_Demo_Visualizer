import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Project } from '../projects/project.entity';
import { UserRole } from './user-role.enum';

// VI: Bang nguoi dung dung cho xac thuc JWT va phan quyen Sprint 1.
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 160 })
  name!: string;

  @Column({ length: 190, unique: true })
  email!: string;

  // VI: Hash mat khau bi an khoi cac query mac dinh de tranh lo du lieu nhay cam.
  @Column({ name: 'password_hash', select: false, length: 255 })
  passwordHash!: string;

  // VI: Luu hash cua reset token, khong bao gio luu token goc vao database.
  @Column({ name: 'password_reset_token_hash', type: 'varchar', length: 128, nullable: true, select: false })
  passwordResetTokenHash!: string | null;

  @Column({ name: 'password_reset_expires_at', type: 'datetime', nullable: true })
  passwordResetExpiresAt!: Date | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.User })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  // VI: Mot user co nhieu du an; backend dung quan he nay de kiem tra owner.
  @OneToMany(() => Project, (project) => project.owner)
  projects!: Project[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
