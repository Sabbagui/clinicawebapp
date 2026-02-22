import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;

  const mockPrisma = {
    payment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
    jest.clearAllMocks();
  });

  it('computes receivedCents and pendingCents correctly', async () => {
    mockPrisma.payment.findMany
      .mockResolvedValueOnce([
        {
          id: 'pay-1',
          amount: 15000,
          method: PaymentMethod.PIX,
          status: PaymentStatus.PAID,
          paidAt: new Date('2026-02-10T16:00:00Z'),
          createdAt: new Date('2026-02-10T12:00:00Z'),
          appointment: {
            id: 'apt-1',
            scheduledDate: new Date('2026-02-10T13:00:00Z'),
            doctor: { id: 'd1', name: 'Dr. A' },
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'pay-2',
          amount: 7000,
          method: PaymentMethod.CASH,
          status: PaymentStatus.PENDING,
          createdAt: new Date('2026-02-10T14:00:00Z'),
          appointment: {
            id: 'apt-2',
            scheduledDate: new Date('2026-02-10T15:00:00Z'),
            doctor: { id: 'd1', name: 'Dr. A' },
          },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.appointment.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    const result = await service.getSummary({
      start: '2026-02-10',
      end: '2026-02-10',
      timezone: 'America/Sao_Paulo',
      doctorId: null,
    });

    expect(result.kpis.receivedCents).toBe(15000);
    expect(result.kpis.pendingCents).toBe(7000);
    expect(result.kpis.paidCount).toBe(1);
    expect(result.kpis.pendingCount).toBe(1);
    expect(result.series.dailyReceived).toEqual([
      { date: '2026-02-10', cents: 15000, count: 1 },
    ]);
    expect(result.series.dailyPending).toEqual([
      { date: '2026-02-10', cents: 7000, count: 1 },
    ]);
  });

  it('uses paidAt as effective date for received values even when appointment date is outside range', async () => {
    mockPrisma.payment.findMany
      .mockResolvedValueOnce([
        {
          id: 'pay-10',
          amount: 9900,
          method: PaymentMethod.PIX,
          status: PaymentStatus.PAID,
          paidAt: new Date('2026-02-20T15:00:00Z'),
          appointment: {
            id: 'apt-10',
            scheduledDate: new Date('2026-02-13T15:00:00Z'),
            doctor: { id: 'd1', name: 'Dr. A' },
          },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.appointment.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await service.getSummary({
      start: '2026-02-20',
      end: '2026-02-20',
      timezone: 'America/Sao_Paulo',
      doctorId: null,
    });

    expect(result.kpis.receivedCents).toBe(9900);
    expect(result.kpis.paidCount).toBe(1);
    expect(result.kpis.pendingCents).toBe(0);
    expect(result.series.dailyReceived).toEqual([
      { date: '2026-02-20', cents: 9900, count: 1 },
    ]);
  });

  it('keeps pending summary filter tied to appointment scheduledDate range', async () => {
    mockPrisma.payment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.appointment.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await service.getSummary({
      start: '2026-02-20',
      end: '2026-02-20',
      timezone: 'America/Sao_Paulo',
      doctorId: null,
    });

    expect(mockPrisma.payment.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          status: PaymentStatus.PENDING,
          appointment: expect.objectContaining({
            scheduledDate: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        }),
      }),
    );
  });

  it('computes receivables aging buckets and totals correctly', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-20T12:00:00.000Z'));

    const pendingRows = [
      {
        id: 'pay-1',
        amount: 10000,
        method: PaymentMethod.PIX,
        status: PaymentStatus.PENDING,
        createdAt: new Date('2026-02-17T15:00:00.000Z'),
        appointment: {
          id: 'apt-1',
          scheduledDate: new Date('2026-02-17T15:00:00.000Z'),
          status: 'CONFIRMED',
          type: 'Consulta',
          patient: { id: 'p1', name: 'Maria', phone: '11999990000' },
          doctor: { id: 'd1', name: 'Dr. A' },
        },
      },
      {
        id: 'pay-2',
        amount: 20000,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
        createdAt: new Date('2026-01-31T15:00:00.000Z'),
        appointment: {
          id: 'apt-2',
          scheduledDate: new Date('2026-01-31T15:00:00.000Z'),
          status: 'CONFIRMED',
          type: 'Consulta',
          patient: { id: 'p2', name: 'Joana', phone: '11999991111' },
          doctor: { id: 'd2', name: 'Dr. B' },
        },
      },
    ];

    mockPrisma.payment.count.mockResolvedValue(2);
    mockPrisma.payment.findMany
      .mockResolvedValueOnce(pendingRows)
      .mockResolvedValueOnce(
        pendingRows.map((row) => ({
          amount: row.amount,
          appointment: { scheduledDate: row.appointment.scheduledDate },
        })),
      );

    const result = await service.getReceivables({
      start: '2026-01-20',
      end: '2026-02-20',
      timezone: 'America/Sao_Paulo',
      doctorId: null,
      method: null,
      limit: 50,
      offset: 0,
    });

    expect(result.meta.total).toBe(2);
    expect(result.kpis.pendingCents).toBe(30000);
    expect(result.kpis.pendingCount).toBe(2);
    expect(result.kpis.buckets.d0_7).toEqual({ cents: 10000, count: 1 });
    expect(result.kpis.buckets.d16_30).toEqual({ cents: 20000, count: 1 });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].ageDays).toBe(20);
    expect(result.rows[0].ageBucket).toBe('16_30');
    expect(result.rows[1].ageDays).toBe(3);
    expect(result.rows[1].ageBucket).toBe('0_7');

    jest.useRealTimers();
  });
});
