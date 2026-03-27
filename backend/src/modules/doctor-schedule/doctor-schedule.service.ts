import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import {
  UpsertWeeklyScheduleDto,
  WeeklyScheduleEntryDto,
} from './dto/upsert-weekly-schedule.dto';

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
];

function parseDateOnly(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (!match) {
    throw new BadRequestException('Data inválida. Use o formato YYYY-MM-DD.');
  }
  return match[1];
}

function parseHHMM(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new BadRequestException('Horário inválido. Use o formato HH:mm.');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function timeDateToMinutes(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

function minutesToTimeDate(totalMinutes: number): Date {
  const hh = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const mm = (totalMinutes % 60).toString().padStart(2, '0');
  return new Date(`1970-01-01T${hh}:${mm}:00.000Z`);
}

function toDateOnlyDate(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

@Injectable()
export class DoctorScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** Remove todas as entradas de cache de slots para um médico específico. */
  private async invalidateDoctorSlots(doctorId: string): Promise<void> {
    const store = this.cache.store as { keys: () => Promise<string[]> };
    const keys = await store.keys();
    const toDelete = keys.filter((k) => k.startsWith(`slots:${doctorId}:`));
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map((k) => this.cache.del(k)));
    }
  }

  private validateEntry(entry: WeeklyScheduleEntryDto) {
    const start = parseHHMM(entry.startTime);
    const end = parseHHMM(entry.endTime);
    if (start >= end) {
      throw new BadRequestException(`Intervalo inválido para o dia ${entry.dayOfWeek}.`);
    }
  }

  private ensureSevenUniqueDays(entries: WeeklyScheduleEntryDto[]) {
    const days = new Set(entries.map((e) => e.dayOfWeek));
    if (days.size !== 7) {
      throw new BadRequestException('A agenda semanal deve conter os 7 dias (0 a 6) sem repeticao.');
    }
    for (let day = 0; day <= 6; day += 1) {
      if (!days.has(day)) {
        throw new BadRequestException('A agenda semanal deve conter os 7 dias (0 a 6).');
      }
    }
  }

  private async validateFutureAppointmentConflicts(
    doctorId: string,
    entries: WeeklyScheduleEntryDto[],
  ) {
    const now = new Date();
    const entryByDay = new Map(entries.map((e) => [e.dayOfWeek, e]));

    const futureAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`) },
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
      },
      select: {
        id: true,
        date: true,
        scheduledDate: true,
        duration: true,
        startTime: true,
        endTime: true,
      },
    });

    for (const appointment of futureAppointments) {
      const baseDate = appointment.date ?? appointment.scheduledDate;
      const dayOfWeek = baseDate.getUTCDay();
      const entry = entryByDay.get(dayOfWeek);
      if (!entry || !entry.isActive) {
        throw new ConflictException(
          `Existe agendamento futuro no dia ${dayOfWeek} que ficara fora da nova agenda.`,
        );
      }

      const scheduleStart = parseHHMM(entry.startTime);
      const scheduleEnd = parseHHMM(entry.endTime);
      const appointmentStart = appointment.startTime
        ? timeDateToMinutes(appointment.startTime)
        : appointment.scheduledDate.getUTCHours() * 60 + appointment.scheduledDate.getUTCMinutes();
      const appointmentEnd = appointment.endTime
        ? timeDateToMinutes(appointment.endTime)
        : appointmentStart + appointment.duration;

      if (appointmentStart < scheduleStart || appointmentEnd > scheduleEnd) {
        throw new ConflictException(
          'A nova agenda conflita com agendamentos futuros existentes.',
        );
      }
    }
  }

  async getWeeklySchedule(doctorId: string) {
    return this.prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsertWeeklySchedule(doctorId: string, dto: UpsertWeeklyScheduleDto) {
    this.ensureSevenUniqueDays(dto.entries);
    dto.entries.forEach((entry) => this.validateEntry(entry));

    await this.validateFutureAppointmentConflicts(doctorId, dto.entries);

    const result = await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.doctorSchedule.upsert({
          where: { doctorId_dayOfWeek: { doctorId, dayOfWeek: entry.dayOfWeek } },
          update: {
            startTime: entry.startTime,
            endTime: entry.endTime,
            slotMinutes: entry.slotMinutes,
            isActive: entry.isActive ?? true,
          },
          create: {
            doctorId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            slotMinutes: entry.slotMinutes,
            isActive: entry.isActive ?? true,
          },
        }),
      ),
    );
    await this.invalidateDoctorSlots(doctorId);
    return result;
  }

  async createBlockedSlot(dto: CreateBlockedSlotDto) {
    const dateOnly = parseDateOnly(dto.date);
    const start = parseHHMM(dto.startTime);
    const end = parseHHMM(dto.endTime);

    if (start >= end) {
      throw new BadRequestException('Horário de bloqueio inválido.');
    }

    const appointmentConflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        date: toDateOnlyDate(dateOnly),
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        startTime: { lt: minutesToTimeDate(end) },
        endTime: { gt: minutesToTimeDate(start) },
      },
      select: { id: true },
    });

    if (appointmentConflict) {
      throw new ConflictException('Bloqueio conflita com agendamento existente.');
    }

    const result = await this.prisma.doctorBlockedSlot.create({
      data: {
        doctorId: dto.doctorId,
        date: toDateOnlyDate(dateOnly),
        startTime: minutesToTimeDate(start),
        endTime: minutesToTimeDate(end),
        reason: dto.reason,
      },
    });
    await this.invalidateDoctorSlots(dto.doctorId);
    return result;
  }

  async deleteBlockedSlot(id: string) {
    try {
      const deleted = await this.prisma.doctorBlockedSlot.delete({ where: { id } });
      await this.invalidateDoctorSlots(deleted.doctorId);
      return deleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Bloqueio não encontrado.');
      }
      throw error;
    }
  }
}
