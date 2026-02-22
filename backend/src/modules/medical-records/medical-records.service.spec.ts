import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MedicalRecordsService } from './medical-records.service';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;

  const mockPrisma = {
    appointment: {
      findUnique: jest.fn(),
    },
    medicalRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MedicalRecordsService>(MedicalRecordsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should reject if appointment is not IN_PROGRESS or COMPLETED', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        status: 'SCHEDULED',
      });

      await expect(service.create(makeDto(), DOCTOR_USER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if a medical record already exists for the appointment', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        status: 'IN_PROGRESS',
      });

      mockPrisma.medicalRecord.findUnique.mockResolvedValue({
        id: 'rec-1',
        appointmentId: 'appt-1',
      });

      await expect(service.create(makeDto(), DOCTOR_USER)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should reject update if record is FINAL', async () => {
      mockPrisma.medicalRecord.findUnique.mockResolvedValue({
        id: 'rec-1',
        status: 'FINAL',
      });

      await expect(
        service.update('rec-1', { subjective: 'Novo texto' }),
      ).rejects.toThrow(ConflictException);
    });
  it('returns 403 when receptionist tries to fetch medical record detail', async () => {
    mockPrisma.medicalRecord.findUnique.mockResolvedValue({
      id: 'mr-1',
      doctorId: 'doctor-1',
      appointment: { doctorId: 'doctor-1' },
    });

    await expect(
      service.findOne('mr-1', { id: 'rec-1', role: UserRole.RECEPTIONIST }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows admin to fetch medical record detail', async () => {
    const record = {
      id: 'mr-1',
      doctorId: 'doctor-1',
      appointment: { doctorId: 'doctor-1' },
    };
    mockPrisma.medicalRecord.findUnique.mockResolvedValue(record);

    const result = await service.findOne('mr-1', {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(result).toEqual(record);
  });
});
