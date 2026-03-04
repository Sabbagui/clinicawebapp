import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus, example: 'CONFIRMED' })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @ApiPropertyOptional({ example: 'Paciente nao compareceu ou solicitou cancelamento' })
  @IsOptional()
  @ValidateIf((dto: UpdateAppointmentStatusDto) => dto.status === AppointmentStatus.CANCELLED)
  @IsString()
  @IsNotEmpty()
  cancelReason?: string;
}
