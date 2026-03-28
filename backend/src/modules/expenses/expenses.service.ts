import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { getRequestAuditMeta } from '@/common/audit/request-audit-meta';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryExpenseDto) {
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
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
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
    return this.getExpenseOrThrow(id);
  }

  async create(dto: CreateExpenseDto, actorId: string, actorRole: string, ip?: string | null, userAgent?: string | null) {
    const expense = await this.prisma.expense.create({
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
      action: 'EXPENSE_CREATE',
      entityType: 'EXPENSE',
      entityId: expense.id,
      metadata: { description: expense.description, amount: expense.amount, categoryId: expense.categoryId },
      ip,
      userAgent,
    });

    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, actorId: string, actorRole: string, ip?: string | null, userAgent?: string | null) {
    await this.getExpenseOrThrow(id);

    const expense = await this.prisma.expense.update({
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
      action: 'EXPENSE_UPDATE',
      entityType: 'EXPENSE',
      entityId: expense.id,
      metadata: { description: dto.description, amount: dto.amount, categoryId: dto.categoryId },
      ip,
      userAgent,
    });

    return expense;
  }

  async remove(id: string, actorId: string, actorRole: string, ip?: string | null, userAgent?: string | null) {
    const expense = await this.getExpenseOrThrow(id);

    // Delete receipt file if exists
    if (expense.receiptPath) {
      const filePath = path.join(process.cwd(), 'uploads', expense.receiptPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore file deletion errors
        }
      }
    }

    await this.prisma.expense.delete({ where: { id } });

    await this.auditService.log({
      actorUserId: actorId,
      actorRole,
      action: 'EXPENSE_DELETE',
      entityType: 'EXPENSE',
      entityId: id,
      metadata: { description: expense.description, amount: expense.amount },
      ip,
      userAgent,
    });

    return { id };
  }

  async uploadReceipt(id: string, file: Express.Multer.File, actorId: string, actorRole: string, ip?: string | null, userAgent?: string | null) {
    const expense = await this.getExpenseOrThrow(id);

    // Delete old receipt file if exists
    if (expense.receiptPath) {
      const oldFilePath = path.join(process.cwd(), 'uploads', expense.receiptPath);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch {
          // ignore file deletion errors
        }
      }
    }

    const relativePath = path.join('expense-receipts', file.filename).replace(/\\/g, '/');

    const updated = await this.prisma.expense.update({
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
      action: 'EXPENSE_RECEIPT_UPLOAD',
      entityType: 'EXPENSE',
      entityId: id,
      metadata: { filename: file.filename },
      ip,
      userAgent,
    });

    return updated;
  }

  async deleteReceipt(id: string, actorId: string, actorRole: string, ip?: string | null, userAgent?: string | null) {
    const expense = await this.getExpenseOrThrow(id);

    if (expense.receiptPath) {
      const filePath = path.join(process.cwd(), 'uploads', expense.receiptPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore file deletion errors
        }
      }
    }

    const updated = await this.prisma.expense.update({
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
      action: 'EXPENSE_RECEIPT_DELETE',
      entityType: 'EXPENSE',
      entityId: id,
      ip,
      userAgent,
    });

    return updated;
  }

  async extractReceipt(file: Express.Multer.File) {
    const result: {
      amountCents: number | null;
      date: string | null;
      description: string | null;
    } = { amountCents: null, date: null, description: null };

    try {
      if (file.mimetype !== 'application/pdf') {
        // Images require OCR — not supported without external service
        return result;
      }

      const buffer = fs.readFileSync(file.path);
      const parsed = await pdfParse(buffer);
      const text = parsed.text;

      if (!text || text.trim().length < 10) {
        // Scanned PDF — no embedded text
        return result;
      }

      result.amountCents = this.extractAmount(text);
      result.date = this.extractDate(text);
      result.description = this.extractDescription(text);
    } catch {
      // Return nulls on any error
    } finally {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    }

    return result;
  }

  private extractAmount(text: string): number | null {
    // Priority: look for TOTAL or VALOR lines first, then any R$ amount
    const patterns = [
      /(?:total|valor total|vl\.?\s*total|grand total)[^\d\n]*?([\d.,]+)/gi,
      /r\$\s*([\d.]+,\d{2})/gi,
      /(?:valor|vl\.?)[^\d\n]*?([\d.]+,\d{2})/gi,
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match) {
        const cents = this.parseBRLToCents(match[1]);
        if (cents !== null && cents > 0) return cents;
      }
    }
    return null;
  }

  private parseBRLToCents(str: string): number | null {
    // Brazilian format: 1.234,56 → 123456
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const value = parseFloat(cleaned);
    if (isNaN(value) || value <= 0) return null;
    return Math.round(value * 100);
  }

  private extractDate(text: string): string | null {
    // dd/mm/yyyy
    const dmyMatch = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) return `${year}-${month}-${day}`;
    }

    // yyyy-mm-dd
    const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) return `${year}-${month}-${day}`;
    }

    return null;
  }

  private extractDescription(text: string): string | null {
    // Take first non-empty line with at least 4 chars as the document title/vendor
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length >= 4);
    if (lines.length > 0) {
      return lines[0].substring(0, 100);
    }
    return null;
  }

  private async getExpenseOrThrow(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        category: { select: { id: true, name: true, label: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    return expense;
  }
}
