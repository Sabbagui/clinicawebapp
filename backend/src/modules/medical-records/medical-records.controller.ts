import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';

@ApiTags('Medical Records')
@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedicalRecordsController {
  constructor(
    private readonly medicalRecordsService: MedicalRecordsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Create SOAP medical record (Doctor, Nurse, Admin)' })
  create(@Body() dto: CreateMedicalRecordDto, @Req() req: any) {
    return this.medicalRecordsService.create(dto, req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Get medical record by ID' })
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Update SOAP medical record (only if DRAFT)' })
  update(@Param('id') id: string, @Body() dto: UpdateMedicalRecordDto) {
    return this.medicalRecordsService.update(id, dto);
  }

  @Post(':id/finalize')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Finalize medical record (locks it permanently)' })
  finalize(@Param('id') id: string, @Req() req: any) {
    return this.medicalRecordsService.finalize(id, req.user.id);
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
