import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Medical Records')
@Controller('medical-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  // TODO: Implement medical records endpoints
}
