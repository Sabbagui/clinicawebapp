import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AppointmentStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { toSaoPauloYYYYMMDD } from '@/common/time/br-time';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrisma = {
    appointment: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('cannot create second payment for same appointment (409)', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'apt-1',
      status: AppointmentStatus.CONFIRMED,
    });
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      appointmentId: 'apt-1',
    });

    await expect(
      service.create('apt-1', { amount: 15000, method: PaymentMethod.PIX }),
    ).rejects.toThrow(ConflictException);
  });

  it('cannot update payment after PAID (409)', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.PAID,
      appointment: { id: 'apt-1' },
    });

    await expect(
      service.update('pay-1', { amount: 20000 }),
    ).rejects.toThrow(ConflictException);
  });

  it('refund only allowed from PAID (409)', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.PENDING,
      appointment: { id: 'apt-1' },
    });

    await expect(service.refund('pay-1')).rejects.toThrow(ConflictException);
  });

  it('marks PENDING payment as PAID using provided paidDate in Sao Paulo day', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.PENDING,
      appointment: { id: 'apt-1' },
    });
    mockPrisma.payment.update.mockResolvedValue({
      id: 'pay-1',
      status: PaymentStatus.PAID,
      paidAt: new Date('2026-02-01T15:00:00.000Z'),
      appointment: { id: 'apt-1' },
    });

    const result = await service.markPaid('pay-1', '2026-02-01');
    const paidAtArg = mockPrisma.payment.update.mock.calls[0][0].data.paidAt as Date;

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(result.paidAt).not.toBeNull();
    expect(toSaoPauloYYYYMMDD(paidAtArg)).toBe('2026-02-01');
    expect(toSaoPauloYYYYMMDD(result.paidAt as Date)).toBe('2026-02-01');
  });

  it('marks PENDING payment as PAID with paidAt set to now when paidDate is omitted', async () => {
    const frozenNow = new Date('2026-02-22T15:30:00.000Z');
    jest.useFakeTimers().setSystemTime(frozenNow);
    try {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PENDING,
        appointment: { id: 'apt-1' },
      });
      mockPrisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
        paidAt: frozenNow,
        appointment: { id: 'apt-1' },
      });

      const result = await service.markPaid('pay-1');
      const paidAtArg = mockPrisma.payment.update.mock.calls[0][0].data.paidAt as Date;

      expect(result.status).toBe(PaymentStatus.PAID);
      expect(result.paidAt).not.toBeNull();
      expect(paidAtArg.getTime()).toBe(frozenNow.getTime());
      expect((result.paidAt as Date).getTime()).toBe(frozenNow.getTime());
    } finally {
      jest.useRealTimers();
    }
  });
});
