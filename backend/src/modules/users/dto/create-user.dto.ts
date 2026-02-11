import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Dr. João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DOCTOR })
  @IsEnum(UserRole)
  role: UserRole;
}
