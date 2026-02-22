import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { AuditService } from '../audit/audit.service';

describe('PatientsController redaction', () => {
  let controller: PatientsController;

  const SUBJECTIVE_MARKER = 'SUBJ_LEAK_TEST_123';
  const ASSESSMENT_MARKER = 'ASSESS_LEAK_TEST_456';
  const PLAN_MARKER = 'PLAN_LEAK_TEST_789';
  const NOTES_MARKER = 'NOTES_LEAK_TEST_999';

  const mockPatientsService = {
    findOne: jest.fn(),
    getHistory: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        { provide: PatientsService, useValue: mockPatientsService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    controller = module.get<PatientsController>(PatientsController);
    jest.clearAllMocks();
  });

  it('redacts GET /patients/:id payload for receptionist and prevents marker leakage', async () => {
    mockPatientsService.findOne.mockResolvedValue({
      id: 'patient-1',
      name: 'Maria',
      phone: '11999998888',
      appointments: [
        {
          id: 'apt-1',
          notes: NOTES_MARKER,
          type: 'Consulta',
        },
      ],
      medicalRecords: [
        {
          id: 'mr-1',
          subjective: SUBJECTIVE_MARKER,
          assessment: ASSESSMENT_MARKER,
          plan: PLAN_MARKER,
        },
      ],
    });

    const result = await controller.findOne('patient-1', {
      user: { id: 'rec-1', role: UserRole.RECEPTIONIST },
    });

    expect(result).not.toBeNull();
    const payloadObj = result as { appointments: Array<Record<string, unknown>> };
    expect(payloadObj).not.toHaveProperty('medicalRecords');
    expect(payloadObj.appointments[0]).not.toHaveProperty('notes');
    const payload = JSON.stringify(payloadObj);
    expect(payload).not.toContain(SUBJECTIVE_MARKER);
    expect(payload).not.toContain(ASSESSMENT_MARKER);
    expect(payload).not.toContain(PLAN_MARKER);
    expect(payload).not.toContain(NOTES_MARKER);
  });

  it('redacts GET /patients/:id/history payload for receptionist and prevents marker leakage', async () => {
    mockPatientsService.getHistory.mockResolvedValue({
      patient: { id: 'patient-1', name: 'Maria' },
      stats: {
        completedCount: 1,
        noShowCount: 0,
        cancelledCount: 0,
        lastVisitAt: null,
        nextAppointmentAt: null,
      },
      timeline: [
        {
          appointmentId: 'apt-1',
          notes: NOTES_MARKER,
          medicalRecord: {
            id: 'mr-1',
            subjectivePreview: SUBJECTIVE_MARKER,
            assessmentPreview: ASSESSMENT_MARKER,
            planPreview: PLAN_MARKER,
          },
        },
      ],
    });

    const result = await controller.getHistory(
      'patient-1',
      undefined,
      undefined,
      { user: { id: 'rec-1', role: UserRole.RECEPTIONIST } },
    );

    const payloadObj = result as { timeline: Array<Record<string, unknown>> };
    expect(payloadObj.timeline[0].medicalRecord).toBeNull();
    expect(payloadObj.timeline[0]).not.toHaveProperty('notes');
    const payload = JSON.stringify(payloadObj);
    expect(payload).not.toContain(SUBJECTIVE_MARKER);
    expect(payload).not.toContain(ASSESSMENT_MARKER);
    expect(payload).not.toContain(PLAN_MARKER);
    expect(payload).not.toContain(NOTES_MARKER);
  });
});
