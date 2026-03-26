import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(onlyActive = false) {
    return this.prisma.expenseCategory.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    });
  }

  async create(dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException('Categoria com este nome já existe');
    return this.prisma.expenseCategory.create({ data: { name: dto.name, label: dto.label } });
  }

  async update(id: string, dto: UpdateExpenseCategoryDto) {
    await this.findOneOrThrow(id);
    return this.prisma.expenseCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const category = await this.findOneOrThrow(id);
    if (category.isDefault) throw new BadRequestException('Categorias padrão não podem ser removidas');
    const count = await this.prisma.expense.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException(`Esta categoria possui ${count} despesa(s) vinculada(s)`);
    return this.prisma.expenseCategory.delete({ where: { id } });
  }

  private async findOneOrThrow(id: string) {
    const cat = await this.prisma.expenseCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }
}
