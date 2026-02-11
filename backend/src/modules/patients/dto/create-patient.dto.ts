import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsDateString } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '12345678900' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({ example: '11987654321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '11987654321', required: false })
  @IsString()
  @IsOptional()
  whatsapp?: string;

  @ApiProperty({ example: 'maria@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiProperty({ example: 'Apto 45', required: false })
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '01234567' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({ example: 'João Silva', required: false })
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiProperty({ example: 'Esposo', required: false })
  @IsString()
  @IsOptional()
  emergencyContactRelationship?: string;

  @ApiProperty({ example: '11912345678', required: false })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}
