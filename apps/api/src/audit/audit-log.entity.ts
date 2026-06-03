import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../users/user-role.enum';

export enum AuditLogStatus {
  Success = 'success',
  Failure = 'failure',
}

// VI: Bang audit luu dau vet thao tac an toan, khong luu payload hoac thong tin nhay cam.
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId!: number | null;

  @Column({ name: 'actor_name_snapshot', type: 'varchar', length: 160, nullable: true })
  actorNameSnapshot!: string | null;

  @Column({ name: 'actor_role', type: 'enum', enum: UserRole, nullable: true })
  actorRole!: UserRole | null;

  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 60 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId!: number | null;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId!: number | null;

  @Column({ name: 'image_id', type: 'int', nullable: true })
  imageId!: number | null;

  @Column({ type: 'enum', enum: AuditLogStatus, default: AuditLogStatus.Success })
  status!: AuditLogStatus;

  @Column({ name: 'safe_message', type: 'varchar', length: 240, nullable: true })
  safeMessage!: string | null;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson!: Record<string, string | number | boolean | null> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
