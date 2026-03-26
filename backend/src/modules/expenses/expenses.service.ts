import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { ExpenseCategory } from '@prisma/client';
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
    const { start, end, category, limit = 50, offset = 0 } = query;

    const where: Record<string, unknown> = {};

    if (start || end) {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.gte = new Date(start + 'T00:00:00.000Z');
      if (end) dateFilter.lte = new Date(end + 'T23:59:59.999Z');
      where.date = dateFilter;
    }

    if (category) {
      where.category = category;
    }

    const [total, data] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
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
        category: dto.category,
        date: new Date(dto.date + 'T12:00:00.000Z'),
        notes: dto.notes,
        createdById: actorId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actorId,
      actorRole,
      action: 'EXPENSE_CREATE',
      entityType: 'EXPENSE',
      entityId: expense.id,
      metadata: { description: expense.description, amount: expense.amount, category: expense.category },
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
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date + 'T12:00:00.000Z') } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    await this.auditService.log({
      actorUserId: actorId,
      actorRole,
      action: 'EXPENSE_UPDATE',
      entityType: 'EXPENSE',
      entityId: expense.id,
      metadata: { description: dto.description, amount: dto.amount, category: dto.category },
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
    if (!process.env.ANTHROPIC_API_KEY) {
      // Clean up temp file before throwing
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      throw new ServiceUnavailableException('Anthropic API key not configured');
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let result: {
      amountCents: number | null;
      date: string | null;
      description: string | null;
      category: ExpenseCategory | null;
    } = {
      amountCents: null,
      date: null,
      description: null,
      category: null,
    };

    try {
      const buffer = fs.readFileSync(file.path);
      const base64 = buffer.toString('base64');

      const isPdf = file.mimetype === 'application/pdf';

      const contentBlock = isPdf
        ? ({
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: 'application/pdf' as const,
              data: base64,
            },
          })
        : ({
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: file.mimetype as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: `Analyze this receipt/document and extract expense data. Return ONLY valid JSON with these fields:
- amountCents: integer in centavos (BRL), null if not found
- date: string in YYYY-MM-DD format, null if not found
- description: brief description of the expense, null if not found
- category: one of RENT, UTILITIES, SALARY, SUPPLIES, EQUIPMENT, MARKETING, OTHER, or null if unclear

Return ONLY the JSON object, no extra text.`,
              },
            ],
          },
        ],
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');

      try {
        // Extract JSON from response (in case model adds extra text)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          result = {
            amountCents: typeof parsed.amountCents === 'number' ? parsed.amountCents : null,
            date: typeof parsed.date === 'string' ? parsed.date : null,
            description: typeof parsed.description === 'string' ? parsed.description : null,
            category: this.isValidCategory(parsed.category) ? parsed.category : null,
          };
        }
      } catch {
        // Return nulls on parse error
      }
    } finally {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    }

    return result;
  }

  private isValidCategory(value: unknown): value is ExpenseCategory {
    return typeof value === 'string' && Object.values(ExpenseCategory).includes(value as ExpenseCategory);
  }

  private async getExpenseOrThrow(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    return expense;
  }
}
