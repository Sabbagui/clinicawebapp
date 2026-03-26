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
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'List expenses with optional filters' })
  findAll(@Query() query: QueryExpenseDto) {
    return this.expensesService.findAll(query);
  }

  // IMPORTANT: extract-receipt must be declared BEFORE :id routes
  @Post('extract-receipt')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Extract expense data from a receipt image or PDF using AI' })
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
        destination: path.join(process.cwd(), 'uploads', 'temp-extractions'),
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
  async extractReceipt(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    return this.expensesService.extractReceipt(file);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Create a new expense' })
  async create(@Body() dto: CreateExpenseDto, @Req() req) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.expensesService.create(dto, req.user.id, req.user.role, ip, userAgent);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update an expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @Req() req,
  ) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.expensesService.update(id, dto, req.user.id, req.user.role, ip, userAgent);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an expense (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  async remove(@Param('id') id: string, @Req() req) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.expensesService.remove(id, req.user.id, req.user.role, ip, userAgent);
  }

  @Post(':id/upload-receipt')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Upload receipt for an expense (imagem ou PDF, max 5MB)' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
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
        destination: path.join(process.cwd(), 'uploads', 'expense-receipts'),
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
  async uploadReceipt(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.expensesService.uploadReceipt(id, file, req.user.id, req.user.role, ip, userAgent);
  }

  @Delete(':id/receipt')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Remove receipt from an expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  async deleteReceipt(@Param('id') id: string, @Req() req) {
    const { ip, userAgent } = getRequestAuditMeta(req);
    return this.expensesService.deleteReceipt(id, req.user.id, req.user.role, ip, userAgent);
  }
}
