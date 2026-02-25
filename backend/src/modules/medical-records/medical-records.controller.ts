import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';

@ApiTags('Medical Records')
@Controller('medical-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MedicalRecordsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new medical record' })
  async create(@Body() dto: CreateMedicalRecordDto, @Request() req) {
    const record = await this.medicalRecordsService.create(dto, req.user);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'MEDICAL_RECORD_CREATE',
      entityType: 'MEDICAL_RECORD',
      entityId: record.id,
      metadata: { appointmentId: record.appointmentId },
      ip,
      userAgent,
    });
    return record;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a medical record by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.medicalRecordsService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update SOAP fields on a medical record' })
  async update(@Param('id') id: string, @Body() dto: UpdateMedicalRecordDto, @Request() req) {
    const record = await this.medicalRecordsService.update(id, dto, req.user);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'MEDICAL_RECORD_UPDATE',
      entityType: 'MEDICAL_RECORD',
      entityId: record.id,
      metadata: {
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
      },
      ip,
      userAgent,
    });
    return record;
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize a medical record (DRAFT -> FINAL)' })
  async finalize(@Param('id') id: string, @Request() req) {
    const record = await this.medicalRecordsService.finalize(id, req.user);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'MEDICAL_RECORD_FINALIZE',
      entityType: 'MEDICAL_RECORD',
      entityId: record.id,
      metadata: { status: record.status, finalizedById: req.user.id },
      ip,
      userAgent,
    });
    return record;
  }
}
