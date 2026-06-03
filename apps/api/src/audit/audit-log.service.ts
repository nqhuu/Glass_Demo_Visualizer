import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/user-role.enum';
import { AuditLog, AuditLogStatus } from './audit-log.entity';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

export interface RecordAuditActionInput {
  actorUserId?: number | null;
  actorNameSnapshot?: string | null;
  actorRole?: UserRole | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  projectId?: number | null;
  imageId?: number | null;
  status?: AuditLogStatus;
  safeMessage?: string | null;
  metadataJson?: Record<string, string | number | boolean | null> | null;
}

// VI: Service audit chi nhan ngu canh allowlist va khong lam hong thao tac chinh neu ghi log that bai.
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  async recordAction(input: RecordAuditActionInput): Promise<void> {
    try {
      const auditLog = this.auditLogsRepository.create({
        actorUserId: input.actorUserId ?? null,
        actorNameSnapshot: input.actorNameSnapshot?.slice(0, 160) ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action.slice(0, 80),
        entityType: input.entityType.slice(0, 60),
        entityId: input.entityId ?? null,
        projectId: input.projectId ?? null,
        imageId: input.imageId ?? null,
        status: input.status ?? AuditLogStatus.Success,
        safeMessage: input.safeMessage?.slice(0, 240) ?? null,
        metadataJson: this.normalizeSafeMetadata(input.metadataJson),
      });

      await this.auditLogsRepository.save(auditLog);
    } catch (error) {
      this.logger.warn({
        module: 'AuditLogService',
        action: 'recordAction',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        message: 'Audit write failed without interrupting the primary action.',
      });
    }
  }

  async listRecent(query: ListAuditLogsDto): Promise<AuditLog[]> {
    try {
      return await this.auditLogsRepository.find({
        order: { createdAt: 'DESC' },
        take: query.limit,
        skip: query.offset,
      });
    } catch (error) {
      this.logger.error({
        module: 'AuditLogService',
        action: 'listRecent',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        message: 'Unable to load audit history.',
      });
      throw new InternalServerErrorException('Unable to load audit history.');
    }
  }

  private normalizeSafeMetadata(metadata: Record<string, string | number | boolean | null> | null | undefined): Record<string, string | number | boolean | null> | null {
    // VI: Metadata audit chi nhan allowlist primitive, cat ngan chuoi va bo qua payload/raw object.
    if (!metadata) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(metadata)
        .slice(0, 20)
        .map(([key, value]) => [key.slice(0, 80), typeof value === 'string' ? value.slice(0, 160) : value]),
    );
  }
}
