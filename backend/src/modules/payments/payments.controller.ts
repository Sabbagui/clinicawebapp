import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { AuditService } from '../audit/audit.service';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';

@ApiTags('Payments')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('appointments/:id/payment')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Get payment for an appointment (returns payment or null)' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  getByAppointment(@Param('id') appointmentId: string) {
    return this.paymentsService.getByAppointmentId(appointmentId);
  }

  @Post('appointments/:id/payment')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Create payment for an appointment' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async create(
    @Param('id') appointmentId: string,
    @Body() dto: CreatePaymentDto,
    @Req() req,
  ) {
    const payment = await this.paymentsService.create(appointmentId, dto);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'PAYMENT_CREATE',
      entityType: 'PAYMENT',
      entityId: payment.id,
      metadata: { amount: payment.amount, method: payment.method },
      ip,
      userAgent,
    });
    return payment;
  }

  @Patch('payments/:id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update payment fields (only while PENDING)' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async update(@Param('id') id: string, @Body() dto: UpdatePaymentDto, @Req() req) {
    const payment = await this.paymentsService.update(id, dto);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'PAYMENT_UPDATE',
      entityType: 'PAYMENT',
      entityId: payment.id,
      metadata: {
        amount: dto.amount,
        method: dto.method,
        notes: dto.notes,
      },
      ip,
      userAgent,
    });
    return payment;
  }

  @Post('payments/:id/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Mark payment as PAID (PENDING -> PAID)',
    description:
      'Optional body: paidDate (YYYY-MM-DD). If provided, paidAt is set to 12:00 America/Sao_Paulo converted to UTC. If omitted, paidAt is set to now.',
  })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiBody({ type: MarkPaidDto, required: false })
  async markPaid(@Param('id') id: string, @Body() dto: MarkPaidDto, @Req() req) {
    const payment = await this.paymentsService.markPaid(id, dto?.paidDate);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'PAYMENT_MARK_PAID',
      entityType: 'PAYMENT',
      entityId: payment.id,
      metadata: { amount: payment.amount, method: payment.method },
      ip,
      userAgent,
    });
    return payment;
  }

  @Post('payments/:id/cancel')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancel payment (PENDING -> CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async cancel(@Param('id') id: string, @Req() req) {
    const payment = await this.paymentsService.cancel(id);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'PAYMENT_CANCEL',
      entityType: 'PAYMENT',
      entityId: payment.id,
      ip,
      userAgent,
    });
    return payment;
  }

  @Post('payments/:id/refund')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Refund payment (PAID -> REFUNDED)' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async refund(@Param('id') id: string, @Req() req) {
    const payment = await this.paymentsService.refund(id);
    const { ip, userAgent } = getRequestAuditMeta(req);
    await this.auditService.log({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: 'PAYMENT_REFUND',
      entityType: 'PAYMENT',
      entityId: payment.id,
      metadata: { amount: payment.amount, method: payment.method },
      ip,
      userAgent,
    });
    return payment;
  }
}
