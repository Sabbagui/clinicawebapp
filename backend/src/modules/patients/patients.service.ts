import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  create(createPatientDto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: createPatientDto,
    });
  }

  findAll() {
    return this.prisma.patient.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
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
}
