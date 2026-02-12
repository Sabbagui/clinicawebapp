import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

const INCLUDE_RELATIONS = {
  patient: { select: { id: true, name: true } },
  doctor: { select: { id: true, name: true } },
  finalizedBy: { select: { id: true, name: true } },
  appointment: { select: { id: true, scheduledDate: true, type: true, status: true } },
};

@Injectable()
export class MedicalRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMedicalRecordDto, requestingUser: { id: string; role: string }) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (!['IN_PROGRESS', 'COMPLETED'].includes(appointment.status)) {
      throw new BadRequestException(
        'Prontuário só pode ser criado para agendamentos em andamento ou concluídos',
      );
    }

    if (appointment.patientId !== dto.patientId) {
      throw new BadRequestException(
        'patientId não corresponde ao paciente do agendamento',
      );
    }

    if (requestingUser.role !== 'ADMIN' && appointment.doctorId !== dto.doctorId) {
      throw new BadRequestException(
        'doctorId não corresponde ao médico do agendamento',
      );
    }

    const existing = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: dto.appointmentId },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe um prontuário para este agendamento',
      );
    }

    return this.prisma.medicalRecord.create({
      data: {
        appointmentId: dto.appointmentId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: INCLUDE_RELATIONS,
    });

    if (!record) {
      throw new NotFoundException('Prontuário não encontrado');
    }

    return record;
  }

  async findByAppointmentId(appointmentId: string) {
    return this.prisma.medicalRecord.findUnique({
      where: { appointmentId },
      include: INCLUDE_RELATIONS,
    });
  }

  async update(id: string, dto: UpdateMedicalRecordDto) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Prontuário não encontrado');
    }

    if (record.status === 'FINAL') {
      throw new ConflictException(
        'Prontuário finalizado não pode ser alterado',
      );
    }

    return this.prisma.medicalRecord.update({
      where: { id },
      data: {
        ...(dto.subjective !== undefined && { subjective: dto.subjective }),
        ...(dto.objective !== undefined && { objective: dto.objective }),
        ...(dto.assessment !== undefined && { assessment: dto.assessment }),
        ...(dto.plan !== undefined && { plan: dto.plan }),
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async finalize(id: string, userId: string) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: INCLUDE_RELATIONS,
    });

    if (!record) {
      throw new NotFoundException('Prontuário não encontrado');
    }

    if (record.status === 'FINAL') {
      return record;
    }

    return this.prisma.medicalRecord.update({
      where: { id },
      data: {
        status: 'FINAL',
        finalizedAt: new Date(),
        finalizedById: userId,
      },
      include: INCLUDE_RELATIONS,
    });
  }
}
