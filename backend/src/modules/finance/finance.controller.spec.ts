import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

describe('FinanceController', () => {
  let controller: FinanceController;

  const mockFinanceService = {
    getSummary: jest.fn(),
    getReceivables: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [{ provide: FinanceService, useValue: mockFinanceService }],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
    jest.clearAllMocks();
  });

  it('forces doctorId to req.user.id for doctor role', async () => {
    mockFinanceService.getSummary.mockImplementation(async (args) => ({
      meta: { start: args.start, end: args.end, timezone: args.timezone, doctorId: args.doctorId },
      kpis: {},
      series: { dailyReceived: [], dailyPending: [] },
      breakdowns: { byMethod: [], byDoctor: [] },
      topPending: [],
    }));

    const req = { user: { id: 'doctor-1', role: UserRole.DOCTOR } };
    const response = await controller.getSummary(
      '2026-02-01',
      '2026-02-28',
      'doctor-2',
      'America/Sao_Paulo',
      req,
    );

    expect(mockFinanceService.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 'doctor-1' }),
    );
    expect(response.meta.doctorId).toBe('doctor-1');
  });

  it('forces doctorId to req.user.id for doctor role on receivables', async () => {
    mockFinanceService.getReceivables.mockImplementation(async (args) => ({
      meta: {
        start: args.start,
        end: args.end,
        timezone: args.timezone,
        doctorId: args.doctorId,
        method: args.method,
        limit: args.limit,
        offset: args.offset,
        total: 0,
      },
      kpis: {
        pendingCents: 0,
        pendingCount: 0,
        buckets: {
          d0_7: { cents: 0, count: 0 },
          d8_15: { cents: 0, count: 0 },
          d16_30: { cents: 0, count: 0 },
          d31p: { cents: 0, count: 0 },
        },
      },
      rows: [],
    }));

    const req = { user: { id: 'doctor-1', role: UserRole.DOCTOR } };
    const response = await controller.getReceivables(
      '2026-02-01',
      '2026-02-28',
      'doctor-2',
      undefined,
      'America/Sao_Paulo',
      '50',
      '0',
      req,
    );

    expect(mockFinanceService.getReceivables).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 'doctor-1' }),
    );
    expect(response.meta.doctorId).toBe('doctor-1');
  });
});
