import type { AuditLogEntry } from './audit-log.types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

// VI: API audit gui JWT trong header, khong dat token vao URL va chi duoc goi tu route admin.
export async function listAuditLogs(accessToken: string, limit = 50): Promise<AuditLogEntry[]> {
  const response = await fetch(`${apiBaseUrl}/admin/audit-logs?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | AuditLogEntry[] | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? 'Audit request failed.');
  }

  return payload as AuditLogEntry[];
}
