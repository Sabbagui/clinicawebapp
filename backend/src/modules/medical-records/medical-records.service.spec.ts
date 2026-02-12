import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { PrismaService } from '@/common/prisma/prisma.service';

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

const DOCTOR_USER = { id: 'doctor-1', role: 'DOCTOR' };

const makeDto = (overrides = {}) => ({
  appointmentId: 'appt-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  subjective: 'Dor pélvica há 3 dias',
  objective: 'PA 120/80',
  assessment: 'Suspeita de endometriose',
  plan: 'Ibuprofeno 400mg 8/8h',
  ...overrides,
});

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;

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
  });
});
