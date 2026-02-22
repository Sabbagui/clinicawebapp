import apiClient from '../client';

export interface AuditLogRow {
  id: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface GetAuditParams {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export interface AuditListResponse {
  meta: {
    entityType: string | null;
    entityId: string | null;
    actorUserId: string | null;
    start: string | null;
    end: string | null;
    limit: number;
  };
  rows: AuditLogRow[];
}

export async function getAuditLogs(params: GetAuditParams): Promise<AuditListResponse> {
  const query = new URLSearchParams();
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.entityId) query.set('entityId', params.entityId);
  if (params.actorUserId) query.set('actorUserId', params.actorUserId);
  if (params.start) query.set('start', params.start);
  if (params.end) query.set('end', params.end);
  if (params.limit) query.set('limit', String(params.limit));

  const response = await apiClient.get<AuditListResponse>(`/api/audit?${query.toString()}`);
  return response.data;
}
