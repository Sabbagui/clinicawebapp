import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus, example: 'CONFIRMED' })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}
