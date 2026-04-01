import { ApiProperty } from '@nestjs/swagger';
import { PrescriptionType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class IssuePrescriptionDto {
  @ApiProperty({ example: 'uuid-do-prontuario' })
  @IsUUID()
  @IsNotEmpty()
  medicalRecordId: string;

  @ApiProperty({ enum: PrescriptionType, example: PrescriptionType.SIMPLES })
  @IsEnum(PrescriptionType)
  @IsNotEmpty()
  type: PrescriptionType;
}
