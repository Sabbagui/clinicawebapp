import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppointmentStatus, UserRole } from '@prisma/client';

const mockPatient = {
  id: 'patient-1',
  name: 'Maria Silva',
  birthDate: new Date('1990-05-15'),
  phone: '11999998888',
  email: 'maria@example.com',
};

const mockAppointment = {
  id: 'apt-1',
  scheduledDate: new Date('2025-01-10T14:00:00Z'),
  duration: 30,
  type: 'Consulta',
  status: AppointmentStatus.COMPLETED,
  notes: null,
  doctor: { id: 'doctor-1', name: 'Dra. Ana' },
  medicalRecord: {
    id: 'mr-1',
    status: 'FINAL',
    finalizedAt: new Date('2025-01-10T15:00:00Z'),
    subjective: 'Paciente relata dor abdominal leve há 3 dias',
    assessment: 'Cólica menstrual sem complicações',
    plan: 'Prescrição de analgésico e retorno em 15 dias',
  },
  payment: {
    id: 'pay-1',
    status: 'PAID',
    amount: 250,
    method: 'PIX',
    paidAt: new Date('2025-01-10T14:30:00Z'),
  },
};

describe('PatientsService', () => {
  let service: PatientsService;

  const mockPrisma = {
    patient: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should return 403 when doctor has no appointments with patient', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.getHistory('patient-1', 'doctor-other', UserRole.DOCTOR, {}),
      ).rejects.toThrow('Sem permissão para acessar este recurso.');
    });

    it('should return 404 when patient does not exist', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.getHistory('nonexistent', 'doctor-1', UserRole.DOCTOR, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to access any patient history', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getHistory(
        'patient-1',
        'admin-1',
        UserRole.ADMIN,
        {},
      );

      expect(result.patient.id).toBe('patient-1');
      // Admin should NOT trigger the ownership check
      expect(mockPrisma.appointment.findFirst).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ doctorId: 'admin-1' }),
        }),
      );
    });

    it('should return timeline sorted DESC with SOAP previews', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);
      // Ownership check passes
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'apt-1' });
      // Stats
      mockPrisma.appointment.count
        .mockResolvedValueOnce(1)  // completed
        .mockResolvedValueOnce(0)  // no-show
        .mockResolvedValueOnce(0); // cancelled
      // Timeline
      mockPrisma.appointment.findMany.mockResolvedValue([mockAppointment]);

      const result = await service.getHistory(
        'patient-1',
        'doctor-1',
        UserRole.DOCTOR,
        {},
      );

      expect(result.patient.name).toBe('Maria Silva');
      expect(result.stats.completedCount).toBe(1);
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].appointmentId).toBe('apt-1');
      expect(result.timeline[0].medicalRecord).not.toBeNull();
      expect(result.timeline[0].medicalRecord!.subjectivePreview).toContain(
        'Paciente relata dor abdominal',
      );
      expect(result.timeline[0].medicalRecord!.assessmentPreview).toContain(
        'Cólica menstrual',
      );
      expect(result.timeline[0].payment).not.toBeNull();
      expect(result.timeline[0].payment!.amount).toBe(250);
    });
  });
});
