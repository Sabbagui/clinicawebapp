import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AppointmentStatus, UserRole } from '@prisma/client';
import {
  assertPatientAccess,
  isClinician,
  isReceptionist,
  type AccessUser,
} from '@/common/auth/access';

function truncatePreview(text: string, maxLength = 160): string {
  if (!text) return '';
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxLength) return collapsed;
  const truncated = collapsed.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  create(createPatientDto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: createPatientDto,
    });
  }

  findAll(user: AccessUser) {
    const where = isClinician(user)
      ? {
          appointments: {
            some: { doctorId: user.id },
          },
        }
      : undefined;

    return this.prisma.patient.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, user: AccessUser) {
    await assertPatientAccess(user, id, this.prisma);

    if (isReceptionist(user)) {
      return this.prisma.patient.findUnique({
        where: { id },
        include: {
          appointments: {
            select: {
              id: true,
              patientId: true,
              doctorId: true,
              scheduledDate: true,
              duration: true,
              status: true,
              type: true,
              reminderSent: true,
              createdAt: true,
              updatedAt: true,
              doctor: {
                select: { id: true, name: true },
              },
            },
            orderBy: { scheduledDate: 'desc' },
          },
        },
      });
    }

    return this.prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            doctor: {
              select: { id: true, name: true },
            },
          },
          orderBy: { scheduledDate: 'desc' },
        },
        medicalRecords: {
          include: {
            doctor: {
              select: { id: true, name: true },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  findByCpf(cpf: string) {
    return this.prisma.patient.findUnique({
      where: { cpf },
    });
  }

  update(id: string, updatePatientDto: UpdatePatientDto) {
    return this.prisma.patient.update({
      where: { id },
      data: updatePatientDto,
    });
  }

  remove(id: string) {
    return this.prisma.patient.delete({
      where: { id },
    });
  }

  async getHistory(
    patientId: string,
    userId: string,
    userRole: UserRole,
    options: { limit?: number; status?: AppointmentStatus },
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        birthDate: true,
        phone: true,
        email: true,
      },
    });
    if (!patient) {
      throw new NotFoundException('Paciente nao encontrado');
    }

    const user: AccessUser = { id: userId, role: userRole };
    await assertPatientAccess(user, patientId, this.prisma);

    const limit = Math.min(options.limit ?? 25, 100);

    const whereClause: Record<string, unknown> = { patientId };
    if (options.status) {
      whereClause.status = options.status;
    }

    const [completedCount, noShowCount, cancelledCount, lastVisit, nextAppointment] =
      await Promise.all([
        this.prisma.appointment.count({
          where: { patientId, status: AppointmentStatus.COMPLETED },
        }),
        this.prisma.appointment.count({
          where: { patientId, status: AppointmentStatus.NO_SHOW },
        }),
        this.prisma.appointment.count({
          where: { patientId, status: AppointmentStatus.CANCELLED },
        }),
        this.prisma.appointment.findFirst({
          where: { patientId, status: AppointmentStatus.COMPLETED },
          orderBy: { scheduledDate: 'desc' },
          select: { scheduledDate: true },
        }),
        this.prisma.appointment.findFirst({
          where: {
            patientId,
            scheduledDate: { gte: new Date() },
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
          },
          orderBy: { scheduledDate: 'asc' },
          select: { scheduledDate: true },
        }),
      ]);

    const receptionistView = isReceptionist(user);
    let timeline;

    if (receptionistView) {
      const appointments = await this.prisma.appointment.findMany({
        where: whereClause,
        orderBy: { scheduledDate: 'desc' },
        take: limit,
        select: {
          id: true,
          scheduledDate: true,
          duration: true,
          type: true,
          status: true,
          doctor: { select: { id: true, name: true } },
          medicalRecord: {
            select: {
              id: true,
              status: true,
              finalizedAt: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              amount: true,
              method: true,
              paidAt: true,
            },
          },
        },
      });

      timeline = appointments.map((apt) => ({
        appointmentId: apt.id,
        scheduledDate: apt.scheduledDate,
        duration: apt.duration,
        type: apt.type,
        status: apt.status,
        notes: null,
        doctor: apt.doctor,
        medicalRecord: apt.medicalRecord
          ? {
              id: apt.medicalRecord.id,
              status: apt.medicalRecord.status,
              finalizedAt: apt.medicalRecord.finalizedAt,
              subjectivePreview: null,
              assessmentPreview: null,
              planPreview: null,
            }
          : null,
        payment: apt.payment ?? null,
      }));
    } else {
      const appointments = await this.prisma.appointment.findMany({
        where: whereClause,
        orderBy: { scheduledDate: 'desc' },
        take: limit,
        select: {
          id: true,
          scheduledDate: true,
          duration: true,
          type: true,
          status: true,
          notes: true,
          doctor: { select: { id: true, name: true } },
          medicalRecord: {
            select: {
              id: true,
              status: true,
              finalizedAt: true,
              subjective: true,
              assessment: true,
              plan: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              amount: true,
              method: true,
              paidAt: true,
            },
          },
        },
      });

      timeline = appointments.map((apt) => ({
        appointmentId: apt.id,
        scheduledDate: apt.scheduledDate,
        duration: apt.duration,
        type: apt.type,
        status: apt.status,
        notes: apt.notes,
        doctor: apt.doctor,
        medicalRecord: apt.medicalRecord
          ? {
              id: apt.medicalRecord.id,
              status: apt.medicalRecord.status,
              finalizedAt: apt.medicalRecord.finalizedAt,
              subjectivePreview: truncatePreview(apt.medicalRecord.subjective),
              assessmentPreview: truncatePreview(apt.medicalRecord.assessment),
              planPreview: truncatePreview(apt.medicalRecord.plan),
            }
          : null,
        payment: apt.payment ?? null,
      }));
    }

    return {
      patient,
      stats: {
        lastVisitAt: lastVisit?.scheduledDate ?? null,
        nextAppointmentAt: nextAppointment?.scheduledDate ?? null,
        completedCount,
        noShowCount,
        cancelledCount,
      },
      timeline,
    };
  }
}
