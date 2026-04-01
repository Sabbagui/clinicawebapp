import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as crypto from 'crypto';
import * as path from 'path';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IncomesService } from './incomes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { QueryIncomeDto } from './dto/query-income.dto';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';

@ApiTags('Incomes')
@Controller('incomes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Listar receitas avulsas com filtros opcionais' })
  findAll(@Query() query: QueryIncomeDto) {
    return this.incomesService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Buscar receita por ID' })
  @ApiParam({ name: 'id', description: 'Income ID' })
  findOne(@Param('id') id: string) {
    return this.incomesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Registrar nova receita avulsa' })
  async create(@Body() dto: CreateIncomeDto, @Req() req) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.incomesService.create(dto, req.user.id, req.user.role, ip, userAgent);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Atualizar receita avulsa' })
  @ApiParam({ name: 'id', description: 'Income ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateIncomeDto, @Req() req) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.incomesService.update(id, dto, req.user.id, req.user.role, ip, userAgent);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir receita avulsa (somente ADMIN)' })
  @ApiParam({ name: 'id', description: 'Income ID' })
  async remove(@Param('id') id: string, @Req() req) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.incomesService.remove(id, req.user.id, req.user.role, ip, userAgent);
  }

  @Post(':id/upload-receipt')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Upload de comprovante para receita (imagem ou PDF, max 5MB)' })
  @ApiParam({ name: 'id', description: 'Income ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { receipt: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: diskStorage({
        destination: path.join(process.cwd(), 'uploads', 'income-receipts'),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${crypto.randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de arquivo inválido. Use JPG, PNG, WEBP ou PDF.'), false);
        }
      },
    }),
  )
  async uploadReceipt(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.incomesService.uploadReceipt(id, file, req.user.id, req.user.role, ip, userAgent);
  }

  @Delete(':id/receipt')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Remover comprovante de receita' })
  @ApiParam({ name: 'id', description: 'Income ID' })
  async deleteReceipt(@Param('id') id: string, @Req() req) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.incomesService.deleteReceipt(id, req.user.id, req.user.role, ip, userAgent);
  }
}
