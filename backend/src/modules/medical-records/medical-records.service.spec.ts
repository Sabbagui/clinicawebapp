import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MedicalRecordsService } from './medical-records.service';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;

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

  it('returns 403 when receptionist tries to fetch medical record detail', async () => {
    mockPrisma.medicalRecord.findUnique.mockResolvedValue({
      id: 'mr-1',
      doctorId: 'doctor-1',
      appointment: { doctorId: 'doctor-1' },
    });

    await expect(
      service.findOne('mr-1', { id: 'rec-1', role: UserRole.RECEPTIONIST }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows admin to fetch medical record detail', async () => {
    const record = {
      id: 'mr-1',
      doctorId: 'doctor-1',
      appointment: { doctorId: 'doctor-1' },
    };
    mockPrisma.medicalRecord.findUnique.mockResolvedValue(record);

    const result = await service.findOne('mr-1', {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(result).toEqual(record);
  });
});
