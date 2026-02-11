import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus } from '@prisma/client';

const INCLUDE_RELATIONS = {
  patient: { select: { id: true, name: true, phone: true } },
  doctor: { select: { id: true, name: true } },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
};

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  private async assertNoConflict(
    doctorId: string,
    scheduledDate: Date,
    duration: number,
    excludeId?: string,
  ) {
    const dayStart = new Date(scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledDate: { gte: dayStart, lte: dayEnd },
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

    await this.assertNoConflict(dto.doctorId, scheduledDate, duration);

    return this.prisma.appointment.create({
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
  }

  async findAll(startDate?: string, endDate?: string, doctorId?: string) {
    const where: any = {};

    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
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

    // Re-check conflict if date, duration, or doctor changed
    if (dto.scheduledDate || dto.duration || dto.doctorId) {
      await this.assertNoConflict(doctorId, scheduledDate, duration, id);
    }

    return this.prisma.appointment.update({
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
}
