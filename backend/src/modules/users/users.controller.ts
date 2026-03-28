import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CertificateService } from '../prescriptions/certificate.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly certificateService: CertificateService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active users' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  findAll(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  // ─── Certificado digital (médico) ────────────────────────────────────────────

  @Post('me/certificate')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload do certificado ICP-Brasil (.p12/.pfx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        certificate: { type: 'string', format: 'binary' },
        password: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('certificate', { storage: memoryStorage() }))
  async uploadCertificate(
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
    @Request() req,
  ) {
    if (!file) throw new BadRequestException('Arquivo de certificado não enviado.');
    if (!password) throw new BadRequestException('Senha do certificado não informada.');
    return this.certificateService.saveCertificate(req.user.id, file.buffer, password);
  }

  @Get('me/certificate')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Retorna metadados do certificado digital do médico' })
  getMyCertificate(@Request() req) {
    return this.certificateService.getCertificateMeta(req.user.id);
  }

  @Delete('me/certificate')
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove o certificado digital do médico' })
  deleteMyCertificate(@Request() req) {
    return this.certificateService.deleteCertificate(req.user.id);
  }

  // ─── CRUD padrão ─────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.password);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
