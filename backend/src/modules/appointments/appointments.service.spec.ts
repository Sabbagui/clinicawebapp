import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppointmentStatus, PaymentStatus } from '@prisma/client';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const mockPrisma = {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
  });

  describe('findByDay', () => {
    function makeApt(overrides: Record<string, unknown>) {
      return {
        id: 'apt-1',
        scheduledDate: new Date('2025-03-15T11:00:00Z'),
        duration: 30,
        status: AppointmentStatus.SCHEDULED,
        type: 'Consulta',
        notes: null,
        doctorId: 'doctor-1',
        patient: { id: 'p1', name: 'Maria', phone: '11999998888', birthDate: new Date('1990-01-01') },
        doctor: { id: 'doctor-1', name: 'Dra. Ana' },
        medicalRecord: null,
        payment: null,
        ...overrides,
      };
    }

    it('should return rows sorted by startTime asc with KPIs', async () => {
      const apts = [
        makeApt({ id: 'apt-1', status: AppointmentStatus.SCHEDULED }),
        makeApt({
          id: 'apt-2',
          scheduledDate: new Date('2025-03-15T14:00:00Z'),
          status: AppointmentStatus.CONFIRMED,
          doctorId: 'doctor-2',
          doctor: { id: 'doctor-2', name: 'Dr. Carlos' },
        }),
      ];
      mockPrisma.appointment.findMany.mockResolvedValue(apts);

      const result = await service.findByDay('2025-03-15');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe('apt-1');
      expect(result.rows[1].id).toBe('apt-2');
      expect(result.kpis.total).toBe(2);
      expect(result.kpis.scheduled).toBe(1);
      expect(result.kpis.confirmed).toBe(1);
      expect(result.kpis.remaining).toBe(2);
      expect(result.meta.date).toBe('2025-03-15');
    });

    it('should filter by doctorId when provided', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([
        makeApt({ id: 'apt-1' }),
      ]);

      await service.findByDay('2025-03-15', 'doctor-1');

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ doctorId: 'doctor-1' }),
        }),
      );
    });

    it('should compute KPIs matching row counts', async () => {
      const apts = [
        makeApt({ id: '1', status: AppointmentStatus.COMPLETED, medicalRecord: { id: 'mr1', status: 'FINAL' } }),
        makeApt({ id: '2', status: AppointmentStatus.COMPLETED, medicalRecord: { id: 'mr2', status: 'FINAL' } }),
        makeApt({ id: '3', status: AppointmentStatus.CANCELLED }),
        makeApt({ id: '4', status: AppointmentStatus.SCHEDULED }),
      ];
      mockPrisma.appointment.findMany.mockResolvedValue(apts);

      const result = await service.findByDay('2025-03-15');

      expect(result.kpis.total).toBe(4);
      expect(result.kpis.completed).toBe(2);
      expect(result.kpis.cancelled).toBe(1);
      expect(result.kpis.scheduled).toBe(1);
      // remaining = total - completed - cancelled - noShow = 4 - 2 - 1 - 0 = 1
      expect(result.kpis.remaining).toBe(1);
    });

    it('should flag upcomingUnconfirmed for SCHEDULED appointments starting within 60 min', async () => {
      const soon = new Date(Date.now() + 30 * 60_000); // 30 min from now
      const later = new Date(Date.now() + 120 * 60_000); // 2 hours from now
      const apts = [
        makeApt({ id: 'soon', scheduledDate: soon, status: AppointmentStatus.SCHEDULED }),
        makeApt({ id: 'later', scheduledDate: later, status: AppointmentStatus.SCHEDULED }),
      ];
      mockPrisma.appointment.findMany.mockResolvedValue(apts);

      const todayStr = soon.toISOString().slice(0, 10);
      const result = await service.findByDay(todayStr);

      const soonRow = result.rows.find((r) => r.id === 'soon');
      const laterRow = result.rows.find((r) => r.id === 'later');
      expect(soonRow!.flags.upcomingUnconfirmed).toBe(true);
      expect(laterRow!.flags.upcomingUnconfirmed).toBe(false);
    });

    it('should flag missingSoap for IN_PROGRESS without medical record', async () => {
      const apts = [
        makeApt({ id: 'no-soap', status: AppointmentStatus.IN_PROGRESS, medicalRecord: null }),
        makeApt({ id: 'has-soap', status: AppointmentStatus.IN_PROGRESS, medicalRecord: { id: 'mr1', status: 'DRAFT' } }),
      ];
      mockPrisma.appointment.findMany.mockResolvedValue(apts);

      const result = await service.findByDay('2025-03-15');

      expect(result.rows.find((r) => r.id === 'no-soap')!.flags.missingSoap).toBe(true);
      expect(result.rows.find((r) => r.id === 'has-soap')!.flags.missingSoap).toBe(false);
    });

    it('should include receivedCents and pendingCents in KPIs', async () => {
      const apts = [
        makeApt({
          id: 'paid',
          payment: { amount: 25000, status: PaymentStatus.PAID },
        }),
        makeApt({
          id: 'pending',
          payment: { amount: 10000, status: PaymentStatus.PENDING },
        }),
        makeApt({
          id: 'cancelled-payment',
          payment: { amount: 5000, status: PaymentStatus.CANCELLED },
        }),
      ];
      mockPrisma.appointment.findMany.mockResolvedValue(apts);

      const result = await service.findByDay('2025-03-15');

      expect(result.kpis.receivedCents).toBe(25000);
      expect(result.kpis.pendingCents).toBe(10000);
    });

    it('uses Sao Paulo day UTC boundaries for daily query', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await service.findByDay('2026-03-15');

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledDate: {
              gte: new Date('2026-03-15T03:00:00.000Z'),
              lt: new Date('2026-03-16T03:00:00.000Z'),
            },
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('stores UTC datetime exactly as received from frontend ISO', async () => {
      const scheduledDateIso = '2026-03-15T19:30:00.000Z'; // 16:30 in America/Sao_Paulo
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.create.mockResolvedValue({
        id: 'apt-1',
        scheduledDate: new Date(scheduledDateIso),
      });

      await service.create({
        patientId: 'p-1',
        doctorId: 'd-1',
        scheduledDate: scheduledDateIso,
        duration: 30,
        type: 'Consulta',
        notes: 'check',
      });

      expect(mockPrisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledDate: new Date(scheduledDateIso),
          }),
        }),
      );
    });
  });
});
