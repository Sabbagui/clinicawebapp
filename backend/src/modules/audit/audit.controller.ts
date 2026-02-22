import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';
import { getSaoPauloDayRange } from '@/common/time/br-time';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List audit logs (Admin only)' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'actorUserId', required: false })
  @ApiQuery({ name: 'start', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'end', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'limit', required: false, description: 'default 50, max 200' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        meta: { type: 'object' },
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              actorUserId: { type: 'string' },
              actorRole: { type: 'string' },
              action: { type: 'string' },
              entityType: { type: 'string' },
              entityId: { type: 'string' },
              metadata: { type: 'object', nullable: true },
              ip: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async list(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      throw new BadRequestException('start must be in YYYY-MM-DD format');
    }
    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      throw new BadRequestException('end must be in YYYY-MM-DD format');
    }

    const parsedLimit = Number.isNaN(Number(limit))
      ? 50
      : Math.min(Math.max(Number(limit) || 50, 1), 200);

    const startUtc = start ? getSaoPauloDayRange(start).startUtc : undefined;
    const endUtc = end ? getSaoPauloDayRange(end).endUtc : undefined;
    if (startUtc && endUtc && startUtc >= endUtc) {
      throw new BadRequestException('start must be before or equal to end');
    }

    return this.auditService.list({
      entityType,
      entityId,
      actorUserId,
      start,
      end,
      startUtc,
      endUtc,
      limit: parsedLimit,
    });
  }
}
