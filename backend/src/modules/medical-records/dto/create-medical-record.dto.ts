import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 'uuid-of-appointment' })
  @IsUUID()
  @IsNotEmpty()
  appointmentId: string;

  @ApiProperty({ example: 'uuid-of-patient' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'uuid-of-doctor' })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({
    example: 'Paciente relata dor pélvica há 3 dias',
    description: 'Subjetivo: queixa principal, história da doença atual',
  })
  @IsString()
  @IsNotEmpty()
  subjective: string;

  @ApiProperty({
    example: 'PA 120/80, FC 72. Abdome: dor à palpação em FIE',
    description: 'Objetivo: exame físico, sinais vitais',
  })
  @IsString()
  @IsNotEmpty()
  objective: string;

  @ApiProperty({
    example: 'Suspeita de endometriose. Solicitar USG pélvica.',
    description: 'Avaliação: diagnóstico, hipóteses diagnósticas',
  })
  @IsString()
  @IsNotEmpty()
  assessment: string;

  @ApiProperty({
    example: 'Ibuprofeno 400mg 8/8h por 5 dias. Retorno com exames em 15 dias.',
    description: 'Plano: tratamento, prescrições, orientações',
  })
  @IsString()
  @IsNotEmpty()
  plan: string;
}
