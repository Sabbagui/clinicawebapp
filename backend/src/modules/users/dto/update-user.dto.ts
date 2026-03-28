import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Dr. João Silva' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.DOCTOR })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Campos do médico
  @ApiPropertyOptional({ example: '123456' })
  @IsString()
  @IsOptional()
  crm?: string;

  @ApiPropertyOptional({ example: 'SP', description: 'UF do CRM (2 letras)' })
  @IsString()
  @Length(2, 2)
  @IsOptional()
  crmUf?: string;

  @ApiPropertyOptional({ example: 'Clínica Saúde da Mulher' })
  @IsString()
  @IsOptional()
  clinicName?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 123 — São Paulo/SP' })
  @IsString()
  @IsOptional()
  clinicAddress?: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsString()
  @IsOptional()
  clinicPhone?: string;
}
