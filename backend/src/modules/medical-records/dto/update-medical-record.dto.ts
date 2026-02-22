import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateMedicalRecordDto {
  @ApiProperty({ required: false, description: 'Subjetivo: queixa principal, HDA' })
  @IsString()
  @IsOptional()
  subjective?: string;

  @ApiProperty({ required: false, description: 'Objetivo: exame físico, sinais vitais' })
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiProperty({ required: false, description: 'Avaliação: diagnóstico, hipóteses' })
  @IsString()
  @IsOptional()
  assessment?: string;

  @ApiProperty({ required: false, description: 'Plano: tratamento, prescrições, orientações' })
  @IsString()
  @IsOptional()
  plan?: string;
}
