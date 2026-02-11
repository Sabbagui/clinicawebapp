import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'uuid-of-patient' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'uuid-of-doctor' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '2026-03-15T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiProperty({ example: 30, description: 'Duration in minutes', required: false })
  @IsInt()
  @Min(15)
  @Max(120)
  @IsOptional()
  duration?: number;

  @ApiProperty({ example: 'Consulta', enum: ['Consulta', 'Retorno', 'Exame'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Paciente com dores abdominais', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
