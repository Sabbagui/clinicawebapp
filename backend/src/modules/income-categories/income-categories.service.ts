import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateIncomeCategoryDto } from './dto/create-income-category.dto';
import { UpdateIncomeCategoryDto } from './dto/update-income-category.dto';

@Injectable()
export class IncomeCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(onlyActive = false) {
    return this.prisma.incomeCategory.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    });
  }

  async create(dto: CreateIncomeCategoryDto) {
    const existing = await this.prisma.incomeCategory.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException('Categoria com este nome já existe');
    return this.prisma.incomeCategory.create({ data: { name: dto.name, label: dto.label } });
  }

  async update(id: string, dto: UpdateIncomeCategoryDto) {
    await this.findOneOrThrow(id);
    return this.prisma.incomeCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const category = await this.findOneOrThrow(id);
    if (category.isDefault) throw new BadRequestException('Categorias padrão não podem ser removidas');
    const count = await this.prisma.income.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException(`Esta categoria possui ${count} receita(s) vinculada(s)`);
    return this.prisma.incomeCategory.delete({ where: { id } });
  }

  private async findOneOrThrow(id: string) {
    const cat = await this.prisma.incomeCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }
}
