import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface AuditLogInput {
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditListParams {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  startUtc?: Date;
  endUtc?: Date;
  start?: string;
  end?: string;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata,
          ip: input.ip ?? undefined,
          userAgent: input.userAgent ?? undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist audit log for action=${input.action}, entityType=${input.entityType}, entityId=${input.entityId}`,
      );
    }
  }

  async list(params: AuditListParams) {
    const where: Record<string, unknown> = {};

    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actorUserId) where.actorUserId = params.actorUserId;
    if (params.startUtc || params.endUtc) {
      where.createdAt = {
        ...(params.startUtc ? { gte: params.startUtc } : {}),
        ...(params.endUtc ? { lt: params.endUtc } : {}),
      };
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
    });

    return {
      meta: {
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        actorUserId: params.actorUserId ?? null,
        start: params.start ?? null,
        end: params.end ?? null,
        limit: params.limit,
      },
      rows,
    };
  }
}
