import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  enumerateDays,
  getDayRangeInTimeZone,
  toTimeZoneYYYYMMDD,
} from '@/common/time/br-time';

export interface FinanceSummaryParams {
  start: string;
  end: string;
  timezone: string;
  doctorId: string | null;
}

export interface FinanceReceivablesParams {
  start: string;
  end: string;
  timezone: string;
  doctorId: string | null;
  method: PaymentMethod | null;
  limit: number;
  offset: number;
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(params: FinanceSummaryParams) {
    const { start, end, timezone, doctorId } = params;
    const { startUtc, endUtc } = this.getRangeBoundariesUtc(start, end, timezone);
    const appointmentInRangeWhere = {
      scheduledDate: { gte: startUtc, lt: endUtc },
      ...(doctorId ? { doctorId } : {}),
    };
    const pendingWhere = {
      status: PaymentStatus.PENDING,
      appointment: appointmentInRangeWhere,
    };

    const [paidPayments, pendingPayments, refundedPayments, cancelledPayments, noShowCount, cancelledApptCount, topPending] =
      await Promise.all([
        this.prisma.payment.findMany({
          where: {
            status: PaymentStatus.PAID,
            paidAt: { gte: startUtc, lt: endUtc },
            appointment: {
              ...(doctorId ? { doctorId } : {}),
            },
          },
          include: {
            appointment: {
              select: {
                id: true,
                scheduledDate: true,
                doctor: { select: { id: true, name: true } },
              },
            },
          },
        }),
        this.prisma.payment.findMany({
          where: pendingWhere,
          include: {
            appointment: {
              select: {
                id: true,
                scheduledDate: true,
                doctor: { select: { id: true, name: true } },
              },
            },
          },
        }),
        this.prisma.payment.findMany({
          where: {
            status: PaymentStatus.REFUNDED,
            refundedAt: { gte: startUtc, lt: endUtc },
            appointment: {
              ...(doctorId ? { doctorId } : {}),
            },
          },
          select: { amount: true },
        }),
        this.prisma.payment.findMany({
          where: {
            status: PaymentStatus.CANCELLED,
            appointment: appointmentInRangeWhere,
          },
          select: { amount: true },
        }),
        this.prisma.appointment.count({
          where: {
            ...appointmentInRangeWhere,
            status: AppointmentStatus.NO_SHOW,
          },
        }),
        this.prisma.appointment.count({
          where: {
            ...appointmentInRangeWhere,
            status: AppointmentStatus.CANCELLED,
          },
        }),
        this.prisma.payment.findMany({
          where: pendingWhere,
          include: {
            appointment: {
              select: {
                id: true,
                scheduledDate: true,
                patient: { select: { id: true, name: true, phone: true } },
                doctor: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { appointment: { scheduledDate: 'asc' } },
          take: 10,
        }),
      ]);

    let receivedCents = 0;
    let pendingCents = 0;
    let refundedCents = 0;
    let cancelledCents = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    let cancelledCount = 0;

    const byMethodMap = new Map<
      PaymentMethod,
      {
        method: PaymentMethod;
        receivedCents: number;
        pendingCents: number;
        countPaid: number;
        countPending: number;
      }
    >();

    const byDoctorMap = new Map<
      string,
      {
        doctorId: string;
        doctorName: string;
        receivedCents: number;
        pendingCents: number;
        countPaid: number;
        countPending: number;
      }
    >();

    const dailyReceivedMap = new Map<string, { date: string; cents: number; count: number }>();
    const dailyPendingMap = new Map<string, { date: string; cents: number; count: number }>();

    for (const payment of paidPayments) {
      if (!payment.paidAt) continue;
      const dayKey = toTimeZoneYYYYMMDD(payment.paidAt, timezone);
      const byMethod = this.getOrInitByMethod(byMethodMap, payment.method);
      const byDoctor = this.getOrInitByDoctor(
        byDoctorMap,
        payment.appointment.doctor.id,
        payment.appointment.doctor.name,
      );

      receivedCents += payment.amount;
      paidCount++;
      byMethod.receivedCents += payment.amount;
      byMethod.countPaid++;
      byDoctor.receivedCents += payment.amount;
      byDoctor.countPaid++;
      const current = dailyReceivedMap.get(dayKey) || { date: dayKey, cents: 0, count: 0 };
      current.cents += payment.amount;
      current.count += 1;
      dailyReceivedMap.set(dayKey, current);
    }

    for (const payment of pendingPayments) {
      const dayKey = toTimeZoneYYYYMMDD(payment.appointment.scheduledDate, timezone);
      const byMethod = this.getOrInitByMethod(byMethodMap, payment.method);
      const byDoctor = this.getOrInitByDoctor(
        byDoctorMap,
        payment.appointment.doctor.id,
        payment.appointment.doctor.name,
      );

      pendingCents += payment.amount;
      pendingCount++;
      byMethod.pendingCents += payment.amount;
      byMethod.countPending++;
      byDoctor.pendingCents += payment.amount;
      byDoctor.countPending++;
      const current = dailyPendingMap.get(dayKey) || { date: dayKey, cents: 0, count: 0 };
      current.cents += payment.amount;
      current.count += 1;
      dailyPendingMap.set(dayKey, current);
    }

    for (const payment of refundedPayments) {
      refundedCents += payment.amount;
      refundedCount++;
    }

    for (const payment of cancelledPayments) {
      cancelledCents += payment.amount;
      cancelledCount++;
    }

    const days = enumerateDays(start, end);
    const dailyReceived = days.map((date) => dailyReceivedMap.get(date) || { date, cents: 0, count: 0 });
    const dailyPending = days.map((date) => dailyPendingMap.get(date) || { date, cents: 0, count: 0 });

    return {
      meta: {
        start,
        end,
        timezone,
        doctorId,
      },
      kpis: {
        receivedCents,
        pendingCents,
        refundedCents,
        cancelledCents,
        paidCount,
        pendingCount,
        refundedCount,
        cancelledCount,
        noShowCount,
        cancelledApptCount,
      },
      series: {
        dailyReceived,
        dailyPending,
      },
      breakdowns: {
        byMethod: Array.from(byMethodMap.values()),
        byDoctor: Array.from(byDoctorMap.values()),
      },
      topPending: topPending.map((payment) => ({
        appointmentId: payment.appointment.id,
        startTime: payment.appointment.scheduledDate.toISOString(),
        patient: payment.appointment.patient,
        doctor: payment.appointment.doctor,
        payment: {
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
        },
      })),
    };
  }

  async getReceivables(params: FinanceReceivablesParams) {
    const { start, end, timezone, doctorId, method, limit, offset } = params;
    const { startUtc, endUtc } = this.getRangeBoundariesUtc(start, end, timezone);

    const where = {
      status: PaymentStatus.PENDING,
      ...(method ? { method } : {}),
      appointment: {
        scheduledDate: { gte: startUtc, lt: endUtc },
        ...(doctorId ? { doctorId } : {}),
      },
    };

    const [total, rowsRaw, kpiRows] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          createdAt: true,
          appointment: {
            select: {
              id: true,
              scheduledDate: true,
              status: true,
              type: true,
              patient: { select: { id: true, name: true, phone: true } },
              doctor: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ appointment: { scheduledDate: 'asc' } }, { createdAt: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.payment.findMany({
        where,
        select: {
          amount: true,
          appointment: { select: { scheduledDate: true } },
        },
      }),
    ]);

    const todayTz = toTimeZoneYYYYMMDD(new Date(), timezone);
    const bucketTotals = {
      d0_7: { cents: 0, count: 0 },
      d8_15: { cents: 0, count: 0 },
      d16_30: { cents: 0, count: 0 },
      d31p: { cents: 0, count: 0 },
    };

    for (const row of kpiRows) {
      const ageDays = this.computeAgeDays(todayTz, row.appointment.scheduledDate, timezone);
      const bucket = this.getAgeBucket(ageDays);
      if (bucket === '0_7') {
        bucketTotals.d0_7.cents += row.amount;
        bucketTotals.d0_7.count += 1;
      } else if (bucket === '8_15') {
        bucketTotals.d8_15.cents += row.amount;
        bucketTotals.d8_15.count += 1;
      } else if (bucket === '16_30') {
        bucketTotals.d16_30.cents += row.amount;
        bucketTotals.d16_30.count += 1;
      } else {
        bucketTotals.d31p.cents += row.amount;
        bucketTotals.d31p.count += 1;
      }
    }

    const rows = rowsRaw.map((row) => {
      const ageDays = this.computeAgeDays(todayTz, row.appointment.scheduledDate, timezone);
      const ageBucket = this.getAgeBucket(ageDays);
      return {
        payment: {
          id: row.id,
          amount: row.amount,
          method: row.method,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        },
        appointment: {
          id: row.appointment.id,
          startTime: row.appointment.scheduledDate.toISOString(),
          status: row.appointment.status,
          type: row.appointment.type,
        },
        patient: row.appointment.patient,
        doctor: row.appointment.doctor,
        ageDays,
        ageBucket,
      };
    });

    rows.sort((a, b) => {
      if (b.ageDays !== a.ageDays) {
        return b.ageDays - a.ageDays;
      }
      return (
        new Date(a.appointment.startTime).getTime() -
        new Date(b.appointment.startTime).getTime()
      );
    });

    return {
      meta: {
        start,
        end,
        timezone,
        doctorId,
        method,
        limit,
        offset,
        total,
      },
      kpis: {
        pendingCents:
          bucketTotals.d0_7.cents +
          bucketTotals.d8_15.cents +
          bucketTotals.d16_30.cents +
          bucketTotals.d31p.cents,
        pendingCount:
          bucketTotals.d0_7.count +
          bucketTotals.d8_15.count +
          bucketTotals.d16_30.count +
          bucketTotals.d31p.count,
        buckets: bucketTotals,
      },
      rows,
    };
  }

  private getOrInitByMethod(
    map: Map<
      PaymentMethod,
      {
        method: PaymentMethod;
        receivedCents: number;
        pendingCents: number;
        countPaid: number;
        countPending: number;
      }
    >,
    method: PaymentMethod,
  ) {
    let row = map.get(method);
    if (!row) {
      row = {
        method,
        receivedCents: 0,
        pendingCents: 0,
        countPaid: 0,
        countPending: 0,
      };
      map.set(method, row);
    }
    return row;
  }

  private getOrInitByDoctor(
    map: Map<
      string,
      {
        doctorId: string;
        doctorName: string;
        receivedCents: number;
        pendingCents: number;
        countPaid: number;
        countPending: number;
      }
    >,
    doctorId: string,
    doctorName: string,
  ) {
    let row = map.get(doctorId);
    if (!row) {
      row = {
        doctorId,
        doctorName,
        receivedCents: 0,
        pendingCents: 0,
        countPaid: 0,
        countPending: 0,
      };
      map.set(doctorId, row);
    }
    return row;
  }

  private getRangeBoundariesUtc(start: string, end: string, timezone: string) {
    const { startUtc } = getDayRangeInTimeZone(start, timezone);
    const { endUtc } = getDayRangeInTimeZone(end, timezone);
    return { startUtc, endUtc };
  }

  private computeAgeDays(todayTz: string, appointmentDate: Date, timezone: string): number {
    const appointmentTz = toTimeZoneYYYYMMDD(appointmentDate, timezone);
    const todayMs = Date.parse(`${todayTz}T00:00:00.000Z`);
    const appointmentMs = Date.parse(`${appointmentTz}T00:00:00.000Z`);
    const days = Math.floor((todayMs - appointmentMs) / 86_400_000);
    return Math.max(0, days);
  }

  private getAgeBucket(ageDays: number): '0_7' | '8_15' | '16_30' | '31+' {
    if (ageDays <= 7) return '0_7';
    if (ageDays <= 15) return '8_15';
    if (ageDays <= 30) return '16_30';
    return '31+';
  }
}
