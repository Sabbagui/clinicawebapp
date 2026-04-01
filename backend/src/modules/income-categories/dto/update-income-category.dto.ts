import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateIncomeCategoryDto } from './create-income-category.dto';

export class UpdateIncomeCategoryDto extends PartialType(CreateIncomeCategoryDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
