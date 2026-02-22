import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({
    summary: 'Get finance summary for date range',
    description:
      'Effective date semantics: PAID is grouped/filtered by paidAt, REFUNDED by refundedAt, and PENDING/CANCELLED by appointment scheduledDate.',
  })
  @ApiQuery({ name: 'start', required: true, description: 'YYYY-MM-DD (inclusive)' })
  @ApiQuery({ name: 'end', required: true, description: 'YYYY-MM-DD (inclusive)' })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'timezone', required: false, example: 'America/Sao_Paulo' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        meta: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            timezone: { type: 'string' },
            doctorId: { type: 'string', nullable: true },
          },
        },
        kpis: {
          type: 'object',
          properties: {
            receivedCents: { type: 'number' },
            pendingCents: { type: 'number' },
            refundedCents: { type: 'number' },
            cancelledCents: { type: 'number' },
            paidCount: { type: 'number' },
            pendingCount: { type: 'number' },
            refundedCount: { type: 'number' },
            cancelledCount: { type: 'number' },
            noShowCount: { type: 'number' },
            cancelledApptCount: { type: 'number' },
          },
        },
        series: {
          type: 'object',
          properties: {
            dailyReceived: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  cents: { type: 'number' },
                  count: { type: 'number' },
                },
              },
            },
            dailyPending: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  cents: { type: 'number' },
                  count: { type: 'number' },
                },
              },
            },
          },
        },
        breakdowns: {
          type: 'object',
          properties: {
            byMethod: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  method: { type: 'string', enum: Object.values(PaymentMethod) },
                  receivedCents: { type: 'number' },
                  pendingCents: { type: 'number' },
                  countPaid: { type: 'number' },
                  countPending: { type: 'number' },
                },
              },
            },
            byDoctor: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  doctorId: { type: 'string' },
                  doctorName: { type: 'string' },
                  receivedCents: { type: 'number' },
                  pendingCents: { type: 'number' },
                  countPaid: { type: 'number' },
                  countPending: { type: 'number' },
                },
              },
            },
          },
        },
        topPending: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              appointmentId: { type: 'string' },
              startTime: { type: 'string' },
              patient: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  phone: { type: 'string', nullable: true },
                },
              },
              doctor: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              payment: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  amount: { type: 'number' },
                  method: { type: 'string', enum: Object.values(PaymentMethod) },
                  status: { type: 'string', enum: Object.values(PaymentStatus) },
                },
              },
            },
          },
        },
      },
    },
  })
  async getSummary(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('doctorId') doctorId: string | undefined,
    @Query('timezone') timezone: string | undefined,
    @Request() req?,
  ) {
    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      throw new BadRequestException('start must be in YYYY-MM-DD format');
    }
    if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      throw new BadRequestException('end must be in YYYY-MM-DD format');
    }

    const effectiveTimezone = timezone || 'America/Sao_Paulo';
    const role = req.user.role as UserRole;
    const effectiveDoctorId =
      role === UserRole.DOCTOR || role === UserRole.NURSE
        ? req.user.id
        : doctorId || null;

    return this.financeService.getSummary({
      start,
      end,
      timezone: effectiveTimezone,
      doctorId: effectiveDoctorId,
    });
  }

  @Get('receivables')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Get pending receivables for collections operations' })
  @ApiQuery({ name: 'start', required: false, description: 'YYYY-MM-DD (inclusive)' })
  @ApiQuery({ name: 'end', required: false, description: 'YYYY-MM-DD (inclusive)' })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'method', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'timezone', required: false, example: 'America/Sao_Paulo' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  async getReceivables(
    @Query('start') start: string | undefined,
    @Query('end') end: string | undefined,
    @Query('doctorId') doctorId: string | undefined,
    @Query('method') method: PaymentMethod | undefined,
    @Query('timezone') timezone: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @Request() req?,
  ) {
    const effectiveTimezone = timezone || 'America/Sao_Paulo';
    const today = this.toYYYYMMDDInTimeZone(new Date(), effectiveTimezone);
    const effectiveEnd = end || today;
    const effectiveStart = start || this.shiftYYYYMMDD(effectiveEnd, -29);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveStart)) {
      throw new BadRequestException('start must be in YYYY-MM-DD format');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveEnd)) {
      throw new BadRequestException('end must be in YYYY-MM-DD format');
    }

    const parsedLimit = limit ? Number.parseInt(limit, 10) : 50;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : 0;
    const effectiveLimit = Math.min(Number.isNaN(parsedLimit) ? 50 : parsedLimit, 200);
    const effectiveOffset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
    if (effectiveLimit < 1) {
      throw new BadRequestException('limit must be >= 1');
    }
    if (effectiveOffset < 0) {
      throw new BadRequestException('offset must be >= 0');
    }

    const role = req.user.role as UserRole;
    const effectiveDoctorId =
      role === UserRole.DOCTOR || role === UserRole.NURSE
        ? req.user.id
        : doctorId || null;

    return this.financeService.getReceivables({
      start: effectiveStart,
      end: effectiveEnd,
      timezone: effectiveTimezone,
      doctorId: effectiveDoctorId,
      method: method || null,
      limit: effectiveLimit,
      offset: effectiveOffset,
    });
  }

  private toYYYYMMDDInTimeZone(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  private shiftYYYYMMDD(dateYYYYMMDD: string, days: number): string {
    const [year, month, day] = dateYYYYMMDD.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
