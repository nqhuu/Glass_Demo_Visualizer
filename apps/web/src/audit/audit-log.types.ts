export type AuditLogStatus = 'success' | 'failure';

// VI: Kieu response audit chi gom ngu canh an toan ma admin duoc phep xem.
export interface AuditLogEntry {
  id: number;
  actorUserId: number | null;
  actorNameSnapshot: string | null;
  actorRole: 'admin' | 'user' | null;
  action: string;
  entityType: string;
  entityId: number | null;
  projectId: number | null;
  imageId: number | null;
  status: AuditLogStatus;
  safeMessage: string | null;
  createdAt: string;
}
