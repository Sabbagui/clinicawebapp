import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('does not throw when persistence fails', async () => {
    mockPrisma.auditLog.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.log({
        actorUserId: 'u1',
        actorRole: 'ADMIN',
        action: 'PAYMENT_MARK_PAID',
        entityType: 'PAYMENT',
        entityId: 'p1',
      }),
    ).resolves.toBeUndefined();
  });
});
