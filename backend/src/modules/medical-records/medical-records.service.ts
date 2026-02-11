import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class MedicalRecordsService {
  constructor(private prisma: PrismaService) {}

  // TODO: Implement medical records management
  // - Create medical record
  // - Get patient records
  // - Update record
  // - Add prescriptions and lab orders
}
