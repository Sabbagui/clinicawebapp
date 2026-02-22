import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  doctorId: string;

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
}
