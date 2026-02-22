import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppointmentStatus, PaymentStatus, UserRole } from '@prisma/client';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditService } from '../audit/audit.service';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  const SUBJECTIVE_MARKER = 'SUBJ_LEAK_TEST_123';
  const ASSESSMENT_MARKER = 'ASSESS_LEAK_TEST_456';
  const PLAN_MARKER = 'PLAN_LEAK_TEST_789';
  const NOTES_MARKER = 'NOTES_LEAK_TEST_999';

  const mockAppointmentsService = {
    findByDay: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockMedicalRecordsService = {
    findByAppointmentId: jest.fn(),
    createBlankForEncounter: jest.fn(),
  };

  const mockPaymentsService = {
    getByAppointmentId: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        { provide: AppointmentsService, useValue: mockAppointmentsService },
        { provide: MedicalRecordsService, useValue: mockMedicalRecordsService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
    jest.clearAllMocks();
  });

  it('should return 400 when completing payment-required appointment without PAID payment', async () => {
    mockMedicalRecordsService.findByAppointmentId.mockResolvedValue({ id: 'mr-1', status: 'FINAL' });
    mockAppointmentsService.findOne.mockResolvedValue({
      id: 'apt-1',
      type: 'Consulta',
      doctorId: 'doctor-1',
    });
    mockPaymentsService.getByAppointmentId.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.PENDING,
    });

    const req = { user: { id: 'doctor-1', role: 'DOCTOR' } };
    await expect(controller.completeAppointment('apt-1', req)).rejects.toThrow(BadRequestException);
    expect(mockAppointmentsService.updateStatus).not.toHaveBeenCalled();
  });

  it('completes appointment when record is FINAL and payment is PAID', async () => {
    const completedAppointment = { id: 'apt-1', status: AppointmentStatus.COMPLETED };
    mockMedicalRecordsService.findByAppointmentId.mockResolvedValue({ id: 'mr-1', status: 'FINAL' });
    mockAppointmentsService.findOne.mockResolvedValue({
      id: 'apt-1',
      type: 'Consulta',
      doctorId: 'doctor-1',
    });
    mockPaymentsService.getByAppointmentId.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.PAID,
    });
    mockAppointmentsService.updateStatus.mockResolvedValue(completedAppointment);
    const req = { user: { id: 'doctor-1', role: 'DOCTOR' } };

    const result = await controller.completeAppointment('apt-1', req);

    expect(mockAppointmentsService.updateStatus).toHaveBeenCalledWith(
      'apt-1',
      AppointmentStatus.COMPLETED,
    );
    expect(result).toEqual(completedAppointment);
  });

  it('logs appointment status change when start encounter succeeds', async () => {
    const req = {
      user: { id: 'doctor-1', role: 'DOCTOR' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const beforeAppointment = {
      id: 'apt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      status: AppointmentStatus.CONFIRMED,
    };
    const startedAppointment = {
      id: 'apt-1',
      patientId: 'patient-1',
      status: AppointmentStatus.IN_PROGRESS,
    };
    const medicalRecord = { id: 'mr-1' };

    mockAppointmentsService.findOne.mockResolvedValue(beforeAppointment);
    mockAppointmentsService.updateStatus.mockResolvedValue(startedAppointment);
    mockMedicalRecordsService.createBlankForEncounter.mockResolvedValue(medicalRecord);

    const result = await controller.startEncounter('apt-1', req);

    expect(result).toEqual({ appointment: startedAppointment, medicalRecord });
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'APPOINTMENT',
        action: 'APPOINTMENT_STATUS_CHANGE',
        entityId: 'apt-1',
        metadata: { from: AppointmentStatus.CONFIRMED, to: AppointmentStatus.IN_PROGRESS },
      }),
    );
  });

  it('returns 403 when doctor tries to fetch another doctor appointment', async () => {
    mockAppointmentsService.findOne.mockResolvedValue({
      id: 'apt-1',
      doctorId: 'doctor-2',
    });

    await expect(
      controller.findOne('apt-1', { user: { id: 'doctor-1', role: UserRole.DOCTOR } }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows admin to fetch any appointment', async () => {
    const appointment = { id: 'apt-1', doctorId: 'doctor-2' };
    mockAppointmentsService.findOne.mockResolvedValue(appointment);

    const result = await controller.findOne('apt-1', {
      user: { id: 'admin-1', role: UserRole.ADMIN },
    });

    expect(result).toEqual(appointment);
  });

  it('redacts /appointments/day payload for receptionist and prevents marker leakage', async () => {
    mockAppointmentsService.findByDay.mockResolvedValue({
      meta: { date: '2026-01-10', timezone: 'America/Sao_Paulo' },
      kpis: { total: 1 },
      rows: [
        {
          id: 'apt-1',
          status: AppointmentStatus.COMPLETED,
          notes: NOTES_MARKER,
          medicalRecord: {
            subjective: SUBJECTIVE_MARKER,
            assessment: ASSESSMENT_MARKER,
            plan: PLAN_MARKER,
          },
          patient: { id: 'p-1', name: 'Maria', phone: '11999999999' },
          doctor: { id: 'doctor-1', name: 'Dra. Ana' },
        },
      ],
    });

    const response = await controller.findByDay(
      '2026-01-10',
      undefined,
      undefined,
      { user: { id: 'rec-1', role: UserRole.RECEPTIONIST } },
    );

    expect(response.rows).toHaveLength(1);
    expect(response.rows[0]).not.toHaveProperty('notes');
    expect(response.rows[0]).not.toHaveProperty('medicalRecord');
    const payload = JSON.stringify(response);
    expect(payload).not.toContain(SUBJECTIVE_MARKER);
    expect(payload).not.toContain(ASSESSMENT_MARKER);
    expect(payload).not.toContain(PLAN_MARKER);
    expect(payload).not.toContain(NOTES_MARKER);
  });
});
