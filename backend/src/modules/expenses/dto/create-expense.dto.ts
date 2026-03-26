import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description: string;

  @ApiProperty({ description: 'Valor em centavos' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'ID da categoria de despesa' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'Data da despesa (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
