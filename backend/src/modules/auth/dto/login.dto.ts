import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;
}
