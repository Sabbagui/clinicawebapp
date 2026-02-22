import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { saoPauloDateAtNoonToUtc } from '@/common/time/br-time';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
];

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByAppointmentId(appointmentId: string) {
    await this.ensureAppointmentExists(appointmentId);

    return this.prisma.payment.findUnique({
      where: { appointmentId },
      include: { appointment: true },
    });
  }

  async create(appointmentId: string, dto: CreatePaymentDto) {
    await this.ensureAppointmentIsActive(appointmentId);

    const existing = await this.prisma.payment.findUnique({
      where: { appointmentId },
    });
    if (existing) {
      throw new ConflictException('Pagamento já existe para este agendamento');
    }

    if (dto.amount < 1) {
      throw new BadRequestException('amount must be greater than or equal to 1');
    }

    return this.prisma.payment.create({
      data: {
        appointmentId,
        amount: dto.amount,
        method: dto.method,
        notes: dto.notes,
      },
      include: { appointment: true },
    });
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const payment = await this.getPaymentOrThrow(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Só é possível atualizar pagamento com status PENDING');
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.method !== undefined ? { method: dto.method } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: { appointment: true },
    });
  }

  async markPaid(id: string, paidDate?: string) {
    const payment = await this.getPaymentOrThrow(id);

    if (payment.status === PaymentStatus.PAID) {
      return payment;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Só é possível marcar como pago quando status for PENDING');
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: paidDate ? saoPauloDateAtNoonToUtc(paidDate) : new Date(),
      },
      include: { appointment: true },
    });
  }

  async cancel(id: string) {
    const payment = await this.getPaymentOrThrow(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Só é possível cancelar pagamento com status PENDING');
    }

    return this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.CANCELLED },
      include: { appointment: true },
    });
  }

  async refund(id: string) {
    const payment = await this.getPaymentOrThrow(id);

    if (payment.status !== PaymentStatus.PAID) {
      throw new ConflictException('Só é possível estornar pagamento com status PAID');
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
      },
      include: { appointment: true },
    });
  }

  private async ensureAppointmentExists(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }
  }

  private async ensureAppointmentIsActive(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, status: true },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new ConflictException('Não é possível criar pagamento para agendamento inativo');
    }
  }

  private async getPaymentOrThrow(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { appointment: true },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    return payment;
  }
}
