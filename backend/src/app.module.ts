import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AuditModule } from './modules/audit/audit.module';
import { DoctorScheduleModule } from './modules/doctor-schedule/doctor-schedule.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    PaymentsModule,
    FinanceModule,
    AuditModule,
    DoctorScheduleModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
