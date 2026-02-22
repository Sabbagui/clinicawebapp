import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateMedicalRecordDto {
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
