import { ApiProperty } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsUUID, Matches } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'uuid-of-patient' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'uuid-of-doctor' })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: 'FIRST_VISIT', enum: AppointmentType })
  @IsEnum(AppointmentType)
  @IsNotEmpty()
  type: AppointmentType;

  @ApiProperty({ example: '2026-03-15', description: 'YYYY-MM-DD' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '09:30', description: 'HH:mm' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @ApiProperty({ example: 'Paciente com dores abdominais', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
