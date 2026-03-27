import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  AppointmentStatus,
  AppointmentType,
  MedicalRecordStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const APPOINTMENT_TYPE_DURATION: Record<AppointmentType, number> = {
  FIRST_VISIT: 60,
  FOLLOW_UP: 30,
  EXAM: 45,
  PROCEDURE: 60,
  URGENT: 30,
};

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
];

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  CONFIRMED: [AppointmentStatus.CHECKED_IN, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  CHECKED_IN: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED],
  IN_PROGRESS: [AppointmentStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

type TimeSlot = { startMinutes: number; endMinutes: number };

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

function minutesToHHMM(totalMinutes: number): string {
  const hh = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const mm = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function minutesToTimeDate(totalMinutes: number): Date {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return new Date(`1970-01-01T${hours}:${minutes}:00.000Z`);
}

function timeDateToMinutes(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

function toDateOnlyDate(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function toScheduledDate(dateOnly: string, minutes: number): Date {
  const hh = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const mm = (minutes % 60).toString().padStart(2, '0');
  return new Date(`${dateOnly}T${hh}:${mm}:00.000Z`);
}

function getDateOnlyFromAppointment(appointment: { date: Date | null; scheduledDate: Date }): string {
  const base = appointment.date ?? appointment.scheduledDate;
  return base.toISOString().slice(0, 10);
}

function getStartMinutesFromAppointment(appointment: {
  startTime: Date | null;
  scheduledDate: Date;
}): number {
  if (appointment.startTime) {
    return timeDateToMinutes(appointment.startTime);
  }
  return appointment.scheduledDate.getUTCHours() * 60 + appointment.scheduledDate.getUTCMinutes();
}

function getEndMinutesFromAppointment(appointment: {
  endTime: Date | null;
  duration: number;
  startTime: Date | null;
  scheduledDate: Date;
}): number {
  if (appointment.endTime) {
    return timeDateToMinutes(appointment.endTime);
  }
  return getStartMinutesFromAppointment(appointment) + appointment.duration;
}

function slotOverlaps(a: TimeSlot, b: TimeSlot): boolean {
  return a.startMinutes < b.endMinutes && a.endMinutes > b.startMinutes;
}

const SLOTS_CACHE_TTL_MS = 120_000; // 2 minutos

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private async validateDoctorSchedule(
    doctorId: string,
    dateOnly: string,
    newSlot: TimeSlot,
  ) {
    const dayOfWeek = toDateOnlyDate(dateOnly).getUTCDay();
    const schedule = await this.prisma.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
    });

    if (!schedule || !schedule.isActive) {
      throw new ConflictException('Médico sem agenda ativa para este dia.');
    }

    const scheduleStart = parseHHMM(schedule.startTime);
    const scheduleEnd = parseHHMM(schedule.endTime);
    if (newSlot.startMinutes < scheduleStart || newSlot.endMinutes > scheduleEnd) {
      throw new ConflictException('Horário fora da jornada configurada do médico.');
    }
  }

  private async validateNoOverlap(
    doctorId: string,
    dateOnly: string,
    newSlot: TimeSlot,
    excludeAppointmentId?: string,
  ) {
    const where: Prisma.AppointmentWhereInput = {
      doctorId,
      date: toDateOnlyDate(dateOnly),
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    };

    const existing = await this.prisma.appointment.findMany({
      where,
      select: { id: true, startTime: true, endTime: true, scheduledDate: true, duration: true },
    });

    for (const appointment of existing) {
      const slot: TimeSlot = {
        startMinutes: getStartMinutesFromAppointment(appointment),
        endMinutes: getEndMinutesFromAppointment(appointment),
      };
      if (slotOverlaps(slot, newSlot)) {
        throw new ConflictException('Conflito de horário: médico já possui agendamento neste período.');
      }
    }
  }

  private async validateNoBlockedSlot(
    doctorId: string,
    dateOnly: string,
    newSlot: TimeSlot,
  ) {
    const blocked = await this.prisma.doctorBlockedSlot.findMany({
      where: { doctorId, date: toDateOnlyDate(dateOnly) },
      select: { id: true, startTime: true, endTime: true },
    });

    for (const item of blocked) {
      const slot: TimeSlot = {
        startMinutes: timeDateToMinutes(item.startTime),
        endMinutes: timeDateToMinutes(item.endTime),
      };
      if (slotOverlaps(slot, newSlot)) {
        throw new ConflictException('Horário indisponível: bloqueio na agenda do médico.');
      }
    }
  }

  private getSlotByType(type: AppointmentType, startTime: string): TimeSlot {
    const startMinutes = parseHHMM(startTime);
    const duration = APPOINTMENT_TYPE_DURATION[type];
    return { startMinutes, endMinutes: startMinutes + duration };
  }

  private ensureValidTransition(current: AppointmentStatus, next: AppointmentStatus) {
    const allowed = STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Transição de ${current} para ${next} não permitida.`);
    }
  }

  async create(dto: CreateAppointmentDto, createdById: string) {
    const dateOnly = parseDateOnly(dto.date);
    const slot = this.getSlotByType(dto.type, dto.startTime);

    await this.validateDoctorSchedule(dto.doctorId, dateOnly, slot);
    await this.validateNoOverlap(dto.doctorId, dateOnly, slot);
    await this.validateNoBlockedSlot(dto.doctorId, dateOnly, slot);

    const data: Prisma.AppointmentCreateInput = {
      patient: { connect: { id: dto.patientId } },
      doctor: { connect: { id: dto.doctorId } },
      createdBy: { connect: { id: createdById } },
      type: dto.type,
      status: AppointmentStatus.SCHEDULED,
      date: toDateOnlyDate(dateOnly),
      startTime: minutesToTimeDate(slot.startMinutes),
      endTime: minutesToTimeDate(slot.endMinutes),
      scheduledDate: toScheduledDate(dateOnly, slot.startMinutes),
      duration: APPOINTMENT_TYPE_DURATION[dto.type],
      notes: dto.notes,
    };

    try {
      return await this.prisma.appointment.create({
        data,
        include: {
          patient: { select: { id: true, name: true } },
          doctor: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Conflito de horário: slot já ocupado para este médico.');
      }
      throw error;
    }
  }

  async findAll(query: QueryAppointmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {};
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;

    if (query.date) {
      where.date = toDateOnlyDate(parseDateOnly(query.date));
    } else if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeNullableFilter = {};
      if (query.startDate) dateFilter.gte = toDateOnlyDate(parseDateOnly(query.startDate));
      if (query.endDate) dateFilter.lte = toDateOnlyDate(parseDateOnly(query.endDate));
      where.date = dateFilter;
    }

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true } },
          doctor: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      data: items,
    };
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const current = await this.prisma.appointment.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    const doctorId = dto.doctorId ?? current.doctorId;
    const type = dto.type ?? current.type;
    const dateOnly = dto.date ? parseDateOnly(dto.date) : getDateOnlyFromAppointment(current);
    const currentStart = minutesToHHMM(getStartMinutesFromAppointment(current));
    const startTime = dto.startTime ?? currentStart;
    const slot = this.getSlotByType(type, startTime);

    if (dto.doctorId || dto.type || dto.date || dto.startTime) {
      await this.validateDoctorSchedule(doctorId, dateOnly, slot);
      await this.validateNoOverlap(doctorId, dateOnly, slot, id);
      await this.validateNoBlockedSlot(doctorId, dateOnly, slot);
    }

    if (dto.status && dto.status !== current.status) {
      this.ensureValidTransition(current.status, dto.status);
    }

    if (dto.status === AppointmentStatus.CANCELLED && !dto.cancelReason) {
      throw new BadRequestException('Informe o motivo do cancelamento.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.patientId ? { patientId: dto.patientId } : {}),
        ...(dto.doctorId ? { doctorId } : {}),
        ...(dto.type ? { type } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.cancelReason !== undefined ? { cancelReason: dto.cancelReason } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.date || dto.startTime || dto.type
          ? {
              date: toDateOnlyDate(dateOnly),
              startTime: minutesToTimeDate(slot.startMinutes),
              endTime: minutesToTimeDate(slot.endMinutes),
              scheduledDate: toScheduledDate(dateOnly, slot.startMinutes),
              duration: APPOINTMENT_TYPE_DURATION[type],
            }
          : {}),
      },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(
    id: string,
    status: AppointmentStatus,
    cancelReason: string | undefined,
    user: { id: string; role: UserRole },
  ) {
    const current = await this.prisma.appointment.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    if (user.role === UserRole.DOCTOR && current.doctorId !== user.id) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar agendamentos de outro médico.',
      );
    }

    this.ensureValidTransition(current.status, status);
    if (status === AppointmentStatus.CANCELLED && !cancelReason) {
      throw new BadRequestException('Informe o motivo do cancelamento.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(status === AppointmentStatus.CANCELLED ? { cancelReason } : {}),
      },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  async getAvailableSlots(doctorId: string, date: string) {
    const dateOnly = parseDateOnly(date);
    const cacheKey = `slots:${doctorId}:${dateOnly}`;

    const cached = await this.cache.get<Array<{ startTime: string; endTime: string }>>(cacheKey);
    if (cached) return cached;

    const dayOfWeek = toDateOnlyDate(dateOnly).getUTCDay();
    const schedule = await this.prisma.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
    });

    if (!schedule || !schedule.isActive) {
      return [];
    }

    const scheduleStart = parseHHMM(schedule.startTime);
    const scheduleEnd = parseHHMM(schedule.endTime);
    const slotMinutes = schedule.slotMinutes;
    const possibleSlots: TimeSlot[] = [];

    for (let cursor = scheduleStart; cursor + slotMinutes <= scheduleEnd; cursor += slotMinutes) {
      possibleSlots.push({ startMinutes: cursor, endMinutes: cursor + slotMinutes });
    }

    const [appointments, blocked] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          doctorId,
          date: toDateOnlyDate(dateOnly),
          status: { in: ACTIVE_STATUSES },
        },
        select: { startTime: true, endTime: true },
      }),
      this.prisma.doctorBlockedSlot.findMany({
        where: { doctorId, date: toDateOnlyDate(dateOnly) },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const occupied: TimeSlot[] = appointments
      .filter((a) => Boolean(a.startTime && a.endTime))
      .map((a) => ({
        startMinutes: timeDateToMinutes(a.startTime!),
        endMinutes: timeDateToMinutes(a.endTime!),
      }));
    const blockedSlots: TimeSlot[] = blocked.map((b) => ({
      startMinutes: timeDateToMinutes(b.startTime),
      endMinutes: timeDateToMinutes(b.endTime),
    }));

    const result = possibleSlots
      .filter((slot) => !occupied.some((busy) => slotOverlaps(slot, busy)))
      .filter((slot) => !blockedSlots.some((busy) => slotOverlaps(slot, busy)))
      .map((slot) => ({
        startTime: minutesToHHMM(slot.startMinutes),
        endTime: minutesToHHMM(slot.endMinutes),
      }));

    await this.cache.set(cacheKey, result, SLOTS_CACHE_TTL_MS);
    return result;
  }

  async getDailyOverview(date: string) {
    const dateOnly = parseDateOnly(date);
    const rows = await this.prisma.appointment.findMany({
      where: { date: toDateOnlyDate(dateOnly) },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: [{ doctor: { name: 'asc' } }, { startTime: 'asc' }],
    });

    const grouped = new Map<
      string,
      {
        doctor: { id: string; name: string };
        counts: Record<AppointmentStatus, number>;
        appointments: typeof rows;
      }
    >();

    for (const row of rows) {
      const key = row.doctorId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          doctor: { id: row.doctor.id, name: row.doctor.name },
          counts: {
            SCHEDULED: 0,
            CONFIRMED: 0,
            CHECKED_IN: 0,
            IN_PROGRESS: 0,
            COMPLETED: 0,
            CANCELLED: 0,
            NO_SHOW: 0,
          },
          appointments: [],
        });
      }
      const entry = grouped.get(key)!;
      entry.counts[row.status] += 1;
      entry.appointments.push(row);
    }

    return {
      date: dateOnly,
      doctors: Array.from(grouped.values()),
    };
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });
  }

  async startEncounter(id: string, user: { id: string; role: UserRole }) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    const allowedStatuses: AppointmentStatus[] = [
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        'Não é possível iniciar atendimento para um agendamento neste status.',
      );
    }

    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException(
        'Você não tem permissão para iniciar atendimento de outro médico.',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.IN_PROGRESS },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    const existingRecord = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: id },
    });
    if (!existingRecord) {
      await this.prisma.medicalRecord.create({
        data: {
          appointmentId: id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          status: MedicalRecordStatus.DRAFT,
        },
      });
    }

    return updated;
  }

  async completeEncounter(id: string, user: { id: string; role: UserRole }) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        medicalRecord: { select: { status: true } },
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Agendamento não está em atendimento.');
    }

    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException(
        'Você não tem permissão para concluir atendimento de outro médico.',
      );
    }

    if (!appointment.medicalRecord || appointment.medicalRecord.status !== MedicalRecordStatus.FINAL) {
      throw new BadRequestException('Finalize o prontuário antes de concluir o atendimento.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.COMPLETED },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  async getAppointmentMedicalRecord(id: string) {
    return this.prisma.medicalRecord.findUnique({
      where: { appointmentId: id },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
        appointment: {
          select: { id: true, scheduledDate: true, type: true, status: true, doctorId: true },
        },
        finalizedBy: { select: { id: true, name: true } },
      },
    });
  }
}
