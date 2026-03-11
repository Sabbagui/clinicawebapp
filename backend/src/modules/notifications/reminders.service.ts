import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendDailyReminders() {
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
    );
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;

    const startOfDay = new Date(`${tomorrowStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${tomorrowStr}T23:59:59.999Z`);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        reminderSent: false,
        scheduledDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        patient: { select: { name: true, whatsapp: true, phone: true } },
        doctor: { select: { name: true } },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const appt of appointments) {
      const timeStr = appt.scheduledDate
        ? appt.scheduledDate
            .toLocaleTimeString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              hour: '2-digit',
              minute: '2-digit',
            })
        : '?';

      const phone = appt.patient.whatsapp ?? appt.patient.phone;
      if (!phone) {
        skipped++;
        continue;
      }

      const message = `Olá ${appt.patient.name}, lembrete da sua consulta com ${appt.doctor.name} amanhã às ${timeStr}.`;

      await this.sendWhatsApp(phone, message);

      await this.prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent: true },
      });

      sent++;
    }

    this.logger.log(
      `Reminders: sent=${sent}, skipped=${skipped}, total=${appointments.length}`,
    );
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    const webhookUrl = this.configService.get<string>('WHATSAPP_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.log(`[REMINDER STUB] ${phone}: ${message}`);
      return;
    }

    const apiKey = this.configService.get<string>('WHATSAPP_API_KEY');
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ phone, message, apiKey }),
      });
      if (!response.ok) {
        this.logger.warn(`Reminder webhook failed for ${phone}: HTTP ${response.status}`);
      }
    } catch (err) {
      this.logger.warn(`Reminder webhook error for ${phone}: ${(err as Error).message}`);
    }
  }
}
