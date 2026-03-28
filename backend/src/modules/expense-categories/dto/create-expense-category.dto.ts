import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateExpenseCategoryDto {
  @ApiProperty({ description: 'Slug único da categoria (ex: RENT)' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, { message: 'name must be uppercase letters, numbers, or underscores' })
  name: string;

  @ApiProperty({ description: 'Nome de exibição em PT-BR' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;
}
