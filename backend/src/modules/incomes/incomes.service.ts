import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { QueryIncomeDto } from './dto/query-income.dto';

@Injectable()
export class IncomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryIncomeDto) {
    const { start, end, categoryId, limit = 50, offset = 0 } = query;

    const where: Record<string, unknown> = {};

    if (start || end) {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.gte = new Date(start + 'T00:00:00.000Z');
      if (end) dateFilter.lte = new Date(end + 'T23:59:59.999Z');
      where.date = dateFilter;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [total, data] = await Promise.all([
      this.prisma.income.count({ where }),
      this.prisma.income.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          category: { select: { id: true, name: true, label: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
    ]);

    return { data, total };
  }

  async findOne(id: string) {
    return this.getIncomeOrThrow(id);
  }

  async create(
    dto: CreateIncomeDto,
    actorId: string,
    actorRole: string,
    ip?: string | null,
    userAgent?: string | null,
  ) {
    const income = await this.prisma.income.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        categoryId: dto.categoryId,
        date: new Date(dto.date + 'T12:00:00.000Z'),
        notes: dto.notes,
        createdById: actorId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        category: { select: { id: true, name: true, label: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actorId,
      actorRole,
      action: 'INCOME_CREATE',
      entityType: 'INCOME',
      entityId: income.id,
      metadata: { description: income.description, amount: income.amount, categoryId: income.categoryId },
      ip,
      userAgent,
    });

    return income;
  }

  async update(
    id: string,
    dto: UpdateIncomeDto,
    actorId: string,
    actorRole: string,
    ip?: string | null,
    userAgent?: string | null,
  ) {
    await this.getIncomeOrThrow(id);

    const income = await this.prisma.income.update({
      where: { id },
      data: {
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date + 'T12:00:00.000Z') } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        category: { select: { id: true, name: true, label: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actorId,
      actorRole,
      action: 'INCOME_UPDATE',
      entityType: 'INCOME',
      entityId: income.id,
      metadata: { description: dto.description, amount: dto.amount },
      ip,
      userAgent,
    });

    return income;
  }

  async remove(
    id: string,
    actorId: string,
    actorRole: string,
    ip?: string | null,
    userAgent?: string | null,
  ) {
    const income = await this.getIncomeOrThrow(id);

    if (income.receiptPath) {
      const filePath = path.join(process.cwd(), 'uploads', income.receiptPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore
        }
      }
    }

    await this.prisma.income.delete({ where: { id } });

    await this.auditService.log({
      actorUserId: actorId,
      actorRole,
      action: 'INCOME_DELETE',
      entityType: 'INCOME',
      entityId: id,
      metadata: { description: income.description, amount: income.amount },
      ip,
      userAgent,
    });

    return { id };
  }

  async uploadReceipt(
    id: string,
    file: Express.Multer.File,
    actorId: string,
    actorRole: string,
    ip?: string | null,
    userAgent?: string | null,
  ) {
    const income = await this.getIncomeOrThrow(id);

    if (income.receiptPath) {
      const oldFilePath = path.join(process.cwd(), 'uploads', income.receiptPath);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch {
          // ignore
        }
      }
    }

    const relativePath = path.join('income-receipts', file.filename).replace(/\\/g, '/');

    const updated = await this.prisma.income.update({
      where: { id },
      data: { receiptPath: relativePath },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        category: { select: { id: true, name: true, label: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actorId,
      actorRole,
      action: 'INCOME_RECEIPT_UPLOAD',
      entityType: 'INCOME',
      entityId: id,
      metadata: { filename: file.filename },
      ip,
      userAgent,
    });

    return updated;
  }

  async deleteReceipt(
    id: string,
    actorId: string,
    actorRole: string,
    ip?: string | null,
    userAgent?: string | null,
  ) {
    const income = await this.getIncomeOrThrow(id);

    if (income.receiptPath) {
      const filePath = path.join(process.cwd(), 'uploads', income.receiptPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore
        }
      }
    }

    const updated = await this.prisma.income.update({
      where: { id },
      data: { receiptPath: null },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        category: { select: { id: true, name: true, label: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actorId,
      actorRole,
      action: 'INCOME_RECEIPT_DELETE',
      entityType: 'INCOME',
      entityId: id,
      ip,
      userAgent,
    });

    return updated;
  }

  private async getIncomeOrThrow(id: string) {
    const income = await this.prisma.income.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        category: { select: { id: true, name: true, label: true } },
      },
    });

    if (!income) throw new NotFoundException('Receita não encontrada');
    return income;
  }
}
