import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { getSaoPauloDayRange, toSaoPauloYYYYMMDD } from '@/common/time/br-time';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus, PaymentStatus, Prisma, PrismaClient } from '@prisma/client';

const PAYMENT_REQUIRED_TYPES = new Set(['CONSULTA']);

function normalizeAppointmentType(type: string): string {
  return type
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function isPaymentRequired(type: string): boolean {
  return PAYMENT_REQUIRED_TYPES.has(normalizeAppointmentType(type));
}

const INCLUDE_RELATIONS = {
  patient: { select: { id: true, name: true, phone: true } },
  doctor: { select: { id: true, name: true } },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'IN_PROGRESS', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
};

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  private async assertNoConflict(
    doctorId: string,
    scheduledDate: Date,
    duration: number,
    excludeId?: string,
    tx: PrismaTransaction = this.prisma,
  ) {
    const saoPauloDay = toSaoPauloYYYYMMDD(scheduledDate);
    const { startUtc, endUtc } = getSaoPauloDayRange(saoPauloDay);

    const existingAppointments = await tx.appointment.findMany({
      where: {
        doctorId,
        scheduledDate: { gte: startUtc, lt: endUtc },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    const newStart = scheduledDate.getTime();
    const newEnd = newStart + duration * 60000;

    for (const existing of existingAppointments) {
      const existStart = existing.scheduledDate.getTime();
      const existEnd = existStart + existing.duration * 60000;

      if (newStart < existEnd && newEnd > existStart) {
        throw new ConflictException(
          'Conflito de horário: já existe um agendamento neste período para este médico',
        );
      }
    }
  }

  async create(dto: CreateAppointmentDto) {
    const scheduledDate = new Date(dto.scheduledDate);
    const duration = dto.duration || 30;

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertNoConflict(dto.doctorId, scheduledDate, duration, undefined, tx);

        return tx.appointment.create({
          data: {
            patientId: dto.patientId,
            doctorId: dto.doctorId,
            scheduledDate,
            duration,
            type: dto.type,
            notes: dto.notes,
          },
          include: INCLUDE_RELATIONS,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error.code === 'P2034') {
        throw new ConflictException(
          'Conflito de horário: tente novamente',
        );
      }
      throw error;
    }
  }

  async findAll(startDate?: string, endDate?: string, doctorId?: string) {
    const where: any = {};

    if (startDate && endDate) {
      const { startUtc } = getSaoPauloDayRange(startDate);
      const { endUtc } = getSaoPauloDayRange(endDate);
      where.scheduledDate = {
        gte: startUtc,
        lt: endUtc,
      };
    }
    if (doctorId) {
      where.doctorId = doctorId;
    }

    return this.prisma.appointment.findMany({
      where,
      include: INCLUDE_RELATIONS,
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async findByDay(date: string, doctorId?: string, status?: AppointmentStatus) {
    const { startUtc, endUtc } = getSaoPauloDayRange(date);

    const where: any = {
      scheduledDate: { gte: startUtc, lt: endUtc },
    };
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        ...INCLUDE_RELATIONS,
        patient: { select: { id: true, name: true, phone: true, birthDate: true } },
        medicalRecord: { select: { id: true, status: true } },
        payment: { select: { amount: true, status: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const now = new Date();
    const nowPlus60 = new Date(now.getTime() + 60 * 60_000);
    const nowMinus90 = new Date(now.getTime() - 90 * 60_000);

    // KPIs
    const kpis = {
      total: appointments.length,
      scheduled: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      remaining: 0,
      receivedCents: 0,
      pendingCents: 0,
    };
    for (const apt of appointments) {
      switch (apt.status) {
        case AppointmentStatus.SCHEDULED: kpis.scheduled++; break;
        case AppointmentStatus.CONFIRMED: kpis.confirmed++; break;
        case AppointmentStatus.IN_PROGRESS: kpis.inProgress++; break;
        case AppointmentStatus.COMPLETED: kpis.completed++; break;
        case AppointmentStatus.NO_SHOW: kpis.noShow++; break;
        case AppointmentStatus.CANCELLED: kpis.cancelled++; break;
      }

      if (apt.payment?.status === PaymentStatus.PAID) {
        kpis.receivedCents += apt.payment.amount;
      }
      if (apt.payment?.status === PaymentStatus.PENDING) {
        kpis.pendingCents += apt.payment.amount;
      }
    }
    kpis.remaining = kpis.total - kpis.completed - kpis.cancelled - kpis.noShow;

    // Rows with flags
    const rows = appointments.map((apt) => {
      const startTime = apt.scheduledDate;
      const endTime = new Date(startTime.getTime() + apt.duration * 60_000);

      // missingSoap: IN_PROGRESS with no record, OR COMPLETED with no FINAL record
      const missingSoap =
        (apt.status === AppointmentStatus.IN_PROGRESS && !apt.medicalRecord) ||
        (apt.status === AppointmentStatus.COMPLETED &&
          (!apt.medicalRecord || apt.medicalRecord.status !== 'FINAL'));

      // upcomingUnconfirmed: starts within 60 min AND status is SCHEDULED
      const upcomingUnconfirmed =
        apt.status === AppointmentStatus.SCHEDULED &&
        startTime >= now &&
        startTime <= nowPlus60;

      // overdueInProgress: IN_PROGRESS and started > 90 min ago
      const overdueInProgress =
        apt.status === AppointmentStatus.IN_PROGRESS &&
        startTime < nowMinus90;

      return {
        id: apt.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: apt.duration,
        status: apt.status,
        type: apt.type,
        notes: apt.notes,
        patient: apt.patient,
        doctor: apt.doctor,
        flags: {
          missingSoap,
          upcomingUnconfirmed,
          overdueInProgress,
        },
      };
    });

    return {
      meta: { date, timezone: 'America/Sao_Paulo' },
      kpis,
      rows,
    };
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: INCLUDE_RELATIONS,
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const scheduledDate = dto.scheduledDate
      ? new Date(dto.scheduledDate)
      : existing.scheduledDate;
    const duration = dto.duration ?? existing.duration;
    const doctorId = dto.doctorId ?? existing.doctorId;

    if (dto.scheduledDate || dto.duration || dto.doctorId) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await this.assertNoConflict(doctorId, scheduledDate, duration, id, tx);

          return tx.appointment.update({
            where: { id },
            data: {
              ...(dto.patientId && { patientId: dto.patientId }),
              ...(dto.doctorId && { doctorId: dto.doctorId }),
              ...(dto.scheduledDate && { scheduledDate }),
              ...(dto.duration && { duration }),
              ...(dto.type && { type: dto.type }),
              ...(dto.notes !== undefined && { notes: dto.notes }),
            },
            include: INCLUDE_RELATIONS,
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof ConflictException) throw error;
        if (error instanceof NotFoundException) throw error;
        if (error.code === 'P2034') {
          throw new ConflictException(
            'Conflito de horário: tente novamente',
          );
        }
        throw error;
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.patientId && { patientId: dto.patientId }),
        ...(dto.type && { type: dto.type }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async updateStatus(id: string, newStatus: AppointmentStatus) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const allowed = VALID_TRANSITIONS[appointment.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de ${appointment.status} para ${newStatus} não permitida`,
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: newStatus },
      include: INCLUDE_RELATIONS,
    });
  }

  async startEncounter(id: string) {
    return this.updateStatus(id, AppointmentStatus.IN_PROGRESS);
  }

  async completeEncounter(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { medicalRecord: true },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (!appointment.medicalRecord || appointment.medicalRecord.status !== 'FINAL') {
      throw new BadRequestException(
        'Finalize o prontuário antes de concluir o atendimento',
      );
    }

    return this.updateStatus(id, AppointmentStatus.COMPLETED);
  }

  async findMedicalRecord(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return this.prisma.medicalRecord.findUnique({
      where: { appointmentId },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
        finalizedBy: { select: { id: true, name: true } },
        appointment: { select: { id: true, scheduledDate: true, type: true, status: true } },
      },
    });
  }
}


