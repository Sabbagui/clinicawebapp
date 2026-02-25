import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordStatus } from '@prisma/client';
import {
  ACCESS_FORBIDDEN_MESSAGE,
  assertMedicalRecordAccess,
  isClinician,
  isReceptionist,
  type AccessUser,
} from '@/common/auth/access';

const INCLUDE_RELATIONS = {
  patient: { select: { id: true, name: true } },
  doctor: { select: { id: true, name: true } },
  appointment: {
    select: { id: true, scheduledDate: true, type: true, status: true, doctorId: true },
  },
  finalizedBy: { select: { id: true, name: true } },
};

@Injectable()
export class MedicalRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMedicalRecordDto, user: AccessUser) {
    if (isReceptionist(user)) {
      throw new ForbiddenException(ACCESS_FORBIDDEN_MESSAGE);
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      select: { id: true, doctorId: true },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento nao encontrado');
    }
    if (isClinician(user) && appointment.doctorId !== user.id) {
      throw new ForbiddenException(ACCESS_FORBIDDEN_MESSAGE);
    }

    const existing = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException('Este agendamento ja possui um prontuario');
    }

    return this.prisma.medicalRecord.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        appointmentId: dto.appointmentId,
        subjective: dto.subjective ?? '',
        objective: dto.objective ?? '',
        assessment: dto.assessment ?? '',
        plan: dto.plan ?? '',
        status: MedicalRecordStatus.DRAFT,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async findByAppointmentId(appointmentId: string, user: AccessUser) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId },
      include: INCLUDE_RELATIONS,
    });

    if (!record) {
      return null;
    }

    assertMedicalRecordAccess(user, record);
    return record;
  }

  async findOne(id: string, user: AccessUser) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: INCLUDE_RELATIONS,
    });
    if (!record) {
      throw new NotFoundException('Prontuario nao encontrado');
    }

    assertMedicalRecordAccess(user, record);
    return record;
  }

  async update(id: string, dto: UpdateMedicalRecordDto, user: AccessUser) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: { appointment: { select: { doctorId: true } } },
    });
    if (!record) {
      throw new NotFoundException('Prontuario nao encontrado');
    }

    assertMedicalRecordAccess(user, record);
    if (record.status === MedicalRecordStatus.FINAL) {
      throw new BadRequestException('Nao e possivel editar um prontuario finalizado');
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

  async finalize(id: string, user: AccessUser) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: { appointment: { select: { doctorId: true } } },
    });
    if (!record) {
      throw new NotFoundException('Prontuario nao encontrado');
    }

    assertMedicalRecordAccess(user, record);
    if (record.status === MedicalRecordStatus.FINAL) {
      throw new BadRequestException('Prontuario ja esta finalizado');
    }

    return this.prisma.medicalRecord.update({
      where: { id },
      data: {
        status: MedicalRecordStatus.FINAL,
        finalizedAt: new Date(),
        finalizedById: user.id,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async createBlankForEncounter(
    appointmentId: string,
    patientId: string,
    doctorId: string,
  ) {
    const existing = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId },
      include: INCLUDE_RELATIONS,
    });
    if (existing) {
      return existing;
    }

    return this.prisma.medicalRecord.create({
      data: {
        appointmentId,
        patientId,
        doctorId,
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        status: MedicalRecordStatus.DRAFT,
      },
      include: INCLUDE_RELATIONS,
    });
  }
}

