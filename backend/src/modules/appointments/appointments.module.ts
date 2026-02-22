import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { MedicalRecordsModule } from '../medical-records/medical-records.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [MedicalRecordsModule, PaymentsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
