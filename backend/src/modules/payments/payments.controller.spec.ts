import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuditService } from '../audit/audit.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const mockPaymentsService = {
    markPaid: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it('creates an audit log when mark-paid succeeds', async () => {
    const req = {
      user: { id: 'admin-1', role: 'ADMIN' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const payment = {
      id: 'pay-1',
      amount: 15000,
      method: PaymentMethod.PIX,
      status: PaymentStatus.PAID,
    };
    mockPaymentsService.markPaid.mockResolvedValue(payment);

    const result = await controller.markPaid('pay-1', {}, req);

    expect(result).toEqual(payment);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'PAYMENT',
        action: 'PAYMENT_MARK_PAID',
        entityId: 'pay-1',
      }),
    );
    expect(mockPaymentsService.markPaid).toHaveBeenCalledWith('pay-1', undefined);
  });

  it('forwards paidDate to service', async () => {
    const req = {
      user: { id: 'admin-1', role: 'ADMIN' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const payment = {
      id: 'pay-1',
      amount: 15000,
      method: PaymentMethod.PIX,
      status: PaymentStatus.PAID,
    };
    mockPaymentsService.markPaid.mockResolvedValue(payment);

    await controller.markPaid('pay-1', { paidDate: '2026-02-01' }, req);

    expect(mockPaymentsService.markPaid).toHaveBeenCalledWith('pay-1', '2026-02-01');
  });
});
