import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserRole, AppointmentStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';
import {
  maybeRedactForReceptionist,
  redactPatientDetailForReceptionist,
  redactPatientHistoryForReceptionist,
} from '@/common/mappers/redaction';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Register a new patient (Admin, Doctor, Receptionist)' })
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active patients' })
  findAll() {
    return this.patientsService.findAll();
  @ApiOperation({ summary: 'Register a new patient' })
  async create(@Body() createPatientDto: CreatePatientDto, @Request() req) {
    const patient = await this.patientsService.create(createPatientDto);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'PATIENT_CREATE',
      entityType: 'PATIENT',
      entityId: patient.id,
      metadata: { cpf: patient.cpf },
      ip,
      userAgent,
    });
    return patient;
  }

  @Get()
  @ApiOperation({ summary: 'Get all patients' })
  findAll(@Request() req) {
    return this.patientsService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get patient by ID with full history',
    description: 'Receptionist responses are redacted for clinical text.',
  })
  async findOne(@Param('id') id: string, @Request() req) {
    const result = await this.patientsService.findOne(id, req.user);
    return maybeRedactForReceptionist(
      req.user.role,
      result,
      redactPatientDetailForReceptionist,
    );
  }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({
    summary: 'Get patient history timeline',
    description:
      'Returns a reverse-chronological timeline of appointments with SOAP previews and payment status. ' +
      'Admin can access all patients. Doctor/Nurse can only access patients they have appointments with. ' +
      'Receptionist responses are redacted for clinical text.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items (default 25, max 100)' })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus, description: 'Filter by appointment status' })
  async getHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('status') status?: AppointmentStatus,
    @Request() req?,
  ) {
    const result = await this.patientsService.getHistory(id, req.user.id, req.user.role, {
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
    return maybeRedactForReceptionist(
      req.user.role,
      result,
      redactPatientHistoryForReceptionist,
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update patient information (Admin, Doctor, Receptionist)' })
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate patient (Admin only)' })
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  @ApiOperation({ summary: 'Update patient information' })
  async update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @Request() req,
  ) {
    await this.patientsService.findOne(id, req.user);
    const patient = await this.patientsService.update(id, updatePatientDto);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'PATIENT_UPDATE',
      entityType: 'PATIENT',
      entityId: patient.id,
      metadata: updatePatientDto as unknown as Prisma.InputJsonValue,
      ip,
      userAgent,
    });
    return patient;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete patient' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.patientsService.findOne(id, req.user);
    const patient = await this.patientsService.remove(id);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'PATIENT_ARCHIVE',
      entityType: 'PATIENT',
      entityId: patient.id,
      ip,
      userAgent,
    });
    return patient;
  }
}
