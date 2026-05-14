import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
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

  @Column({ type: 'enum', enum: UserRole, default: UserRole.User })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
