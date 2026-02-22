import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ example: 15000, description: 'Amount in centavos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CREDIT_CARD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Pagamento parcial ajustado' })
  @IsOptional()
  @IsString()
  notes?: string;
}
