import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  patientId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  doctorId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subjective?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  assessment?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiProperty({ required: false, description: 'Código CID-10 (ex: N92.0)' })
  @IsString()
  @IsOptional()
  cid10?: string;

  @ApiProperty({ required: false, description: 'Lista de prescrições estruturadas' })
  @IsArray()
  @IsOptional()
  prescriptions?: object[];
}
