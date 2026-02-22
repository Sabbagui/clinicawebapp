import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class MarkPaidDto {
  @ApiPropertyOptional({
    example: '2026-02-01',
    description:
      'Optional Sao Paulo wall-date (YYYY-MM-DD). When provided, paidAt is set to 12:00 America/Sao_Paulo converted to UTC.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'paidDate must be in YYYY-MM-DD format',
  })
  paidDate?: string;
}
