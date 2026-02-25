import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { isPaymentRequired } from './appointments.service';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditService } from '../audit/audit.service';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppointmentStatus, PaymentStatus, UserRole } from '@prisma/client';
import {
  assertAppointmentAccess,
  isClinician,
  type AccessUser,
} from '@/common/auth/access';
import {
  maybeRedactForReceptionist,
  redactAppointmentDetailForReceptionist,
  redactAppointmentsDayResponseForReceptionist,
} from '@/common/mappers/redaction';

// Status action RBAC matrix:
// Confirm:   Receptionist, Doctor, Nurse, Admin
// Cancel:    Receptionist, Admin
// No-show:   Receptionist, Admin
// Start:     Doctor, Nurse, Admin
// Complete:  Doctor, Nurse, Admin

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly medicalRecordsService: MedicalRecordsService,
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  async create(@Body() dto: CreateAppointmentDto, @Request() req) {
    const user = req.user as AccessUser;
    if (isClinician(user) && dto.doctorId !== user.id) {
      throw new ForbiddenException('Sem permissão para acessar este recurso.');
    }

    const appointment = await this.appointmentsService.create(dto);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'APPOINTMENT_CREATE',
      entityType: 'APPOINTMENT',
      entityId: appointment.id,
      metadata: {
        status: appointment.status,
        scheduledDate: appointment.scheduledDate,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
      },
      ip,
      userAgent,
    });
    return appointment;
  }

  @Get()
  @ApiOperation({ summary: 'Get appointments by date range' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('doctorId') doctorId?: string,
    @Request() req?,
  ) {
    const user = req.user as AccessUser;
    const effectiveDoctorId = isClinician(user) ? user.id : doctorId;
    return this.appointmentsService.findAll(startDate, endDate, effectiveDoctorId);
  }

  @Get('day')
  @ApiOperation({
    summary: 'Get appointments for a specific day (dashboard view)',
    description:
      'Returns KPIs, attention flags, and rows sorted by startTime. ' +
      'Doctor/Nurse auto-filters to own schedule when doctorId is not provided. ' +
      'Receptionist responses are redacted for clinical text.',
  })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  async findByDay(
    @Query('date') date: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: AppointmentStatus,
    @Request() req?,
  ) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    // Auto-filter: Doctor/Nurse see only their own schedule unless doctorId explicitly provided
    const user = req.user as AccessUser;
    const effectiveDoctorId = isClinician(user) ? user.id : doctorId;

    const result = await this.appointmentsService.findByDay(date, effectiveDoctorId, status);
    return maybeRedactForReceptionist(
      user.role,
      result,
      redactAppointmentsDayResponseForReceptionist,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    const user = req.user as AccessUser;
    const appointment = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(user, appointment);
    return maybeRedactForReceptionist(
      user.role,
      appointment,
      redactAppointmentDetailForReceptionist,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update appointment details' })
  async update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @Request() req) {
    const user = req.user as AccessUser;
    const existing = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(user, existing);
    if (isClinician(user) && dto.doctorId && dto.doctorId !== user.id) {
      throw new ForbiddenException('Sem permissão para acessar este recurso.');
    }
    return this.appointmentsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update appointment status' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto, @Request() req) {
    const appointment = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(req.user as AccessUser, appointment);
    return this.appointmentsService.updateStatus(id, dto.status);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a scheduled appointment' })
  async confirm(@Param('id') id: string, @Request() req) {
    const before = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(req.user as AccessUser, before);
    const appointment = await this.appointmentsService.updateStatus(
      id,
      AppointmentStatus.CONFIRMED,
    );
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'APPOINTMENT_STATUS_CHANGE',
      entityType: 'APPOINTMENT',
      entityId: appointment.id,
      metadata: { from: before.status, to: appointment.status },
      ip,
      userAgent,
    });
    return appointment;
  }

  @Post(':id/no-show')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Mark appointment as no-show (Admin/Receptionist only)' })
  async noShow(@Param('id') id: string, @Request() req) {
    const before = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(req.user as AccessUser, before);
    const appointment = await this.appointmentsService.updateStatus(
      id,
      AppointmentStatus.NO_SHOW,
    );
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'APPOINTMENT_STATUS_CHANGE',
      entityType: 'APPOINTMENT',
      entityId: appointment.id,
      metadata: { from: before.status, to: appointment.status },
      ip,
      userAgent,
    });
    return appointment;
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancel an appointment (Admin/Receptionist only)' })
  async cancel(@Param('id') id: string, @Request() req) {
    const before = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(req.user as AccessUser, before);
    const appointment = await this.appointmentsService.updateStatus(
      id,
      AppointmentStatus.CANCELLED,
    );
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'APPOINTMENT_STATUS_CHANGE',
      entityType: 'APPOINTMENT',
      entityId: appointment.id,
      metadata: { from: before.status, to: appointment.status },
      ip,
      userAgent,
    });
    return appointment;
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Start encounter: set IN_PROGRESS and create DRAFT medical record' })
  async startEncounter(@Param('id') id: string, @Request() req) {
    const before = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(req.user as AccessUser, before);
    const appointment = await this.appointmentsService.updateStatus(
      id,
      AppointmentStatus.IN_PROGRESS,
    );

    const medicalRecord = await this.medicalRecordsService.createBlankForEncounter(
      appointment.id,
      appointment.patientId,
      req.user.id,
    );

    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'APPOINTMENT_STATUS_CHANGE',
      entityType: 'APPOINTMENT',
      entityId: appointment.id,
      metadata: { from: before.status, to: appointment.status },
      ip,
      userAgent,
    });

    return { appointment, medicalRecord };
  }

  @Get(':id/medical-record')
  @ApiOperation({ summary: 'Get the medical record for an appointment' })
  async getAppointmentMedicalRecord(@Param('id') id: string, @Request() req) {
    const appointment = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(req.user as AccessUser, appointment);
    return this.medicalRecordsService.findByAppointmentId(id, req.user as AccessUser);
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Complete appointment (requires finalized medical record and paid payment when required)' })
  async completeAppointment(@Param('id') id: string, @Request() req) {
    const user = req.user as AccessUser;
    const appointment = await this.appointmentsService.findOne(id);
    assertAppointmentAccess(user, appointment);

    const record = await this.medicalRecordsService.findByAppointmentId(id, user);
    if (!record) {
      throw new BadRequestException(
        'Não é possível concluir sem prontuário médico',
      );
    }
    if (record.status !== 'FINAL') {
      throw new BadRequestException(
        'O prontuário deve ser finalizado antes de concluir o atendimento',
      );
    }

    if (isPaymentRequired(appointment.type)) {
      const payment = await this.paymentsService.getByAppointmentId(id);
      if (!payment || payment.status !== PaymentStatus.PAID) {
        throw new BadRequestException(
          'Pagamento pendente. Marque como pago antes de concluir.',
        );
      }
    }

    const updated = await this.appointmentsService.updateStatus(
      id,
      AppointmentStatus.COMPLETED,
    );
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'APPOINTMENT_STATUS_CHANGE',
      entityType: 'APPOINTMENT',
      entityId: updated.id,
      metadata: { from: appointment.status, to: updated.status },
      ip,
      userAgent,
    });
    return updated;
  }
}
